import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { DecisionRequest, DecisionResult } from '@tawala/core'

export async function POST(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const body: DecisionRequest = await req.json()
  const { title, description, options, context } = body

  if (!title || !description) {
    return NextResponse.json({ error: 'title and description are required' }, { status: 400 })
  }

  // Fetch user's active goals for context
  const month = new Date().toISOString().slice(0, 7)
  const { data: goals } = await supabase
    .from('goals')
    .select('title, progress_percent, is_primary')
    .eq('user_id', user.id)
    .eq('month', month)
    .eq('status', 'active')

  const goalContext = goals?.length
    ? `Current monthly goals: ${goals.map((g: { title: string; progress_percent: number; is_primary: boolean }) => `"${g.title}" (${g.progress_percent}% done${g.is_primary ? ', PRIMARY' : ''})`).join('; ')}`
    : 'No active goals this month.'

  const optionsText = options?.length
    ? `\nOptions being considered:\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`
    : ''

  const additionalContext = context ? `\nAdditional context: ${context}` : ''

  const prompt = `You are TAWALA, a life advisor for a young Kenyan professional. Evaluate this decision and respond ONLY with valid JSON.

Decision: "${title}"
Details: ${description}${optionsText}${additionalContext}

${goalContext}

Respond with this exact JSON structure:
{
  "recommendation": "clear one-sentence recommendation",
  "reasoning": "2-3 sentence explanation of your reasoning",
  "pros": ["pro 1", "pro 2", "pro 3"],
  "cons": ["con 1", "con 2"],
  "risk_level": "low" | "medium" | "high",
  "confidence_score": 0-100
}`

  let result: DecisionResult

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const geminiResult = await model.generateContent(prompt)
    const text = geminiResult.response.text().trim()

    // Strip markdown code fences if present
    const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    result = JSON.parse(jsonText) as DecisionResult
  } catch {
    // Fallback if Gemini fails or JSON parse fails
    result = {
      recommendation: 'Consider this decision carefully against your current goals.',
      reasoning: 'AI evaluation is temporarily unavailable. Review your goals and priorities before deciding.',
      pros: ['Aligns with personal growth'],
      cons: ['Requires careful consideration'],
      risk_level: 'medium',
      confidence_score: 0,
    }
  }

  return NextResponse.json(result)
}
