import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { evaluatePurchase, allocateBudget } from '@tawala/core'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const body = await req.json()
  const { item, amount_kes, category } = body

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('monthly_income_kes')
    .eq('id', user.id)
    .single()

  const income = profile?.monthly_income_kes ?? 45000
  const allocations = allocateBudget(income)

  // Fetch actual_spent for current month
  const month = new Date().toISOString().slice(0, 7)
  const { data: txRows } = await supabase
    .from('transactions')
    .select('category, amount_kes')
    .eq('user_id', user.id)
    .gte('date', `${month}-01`)
    .lt('date', `${month}-32`)

  const actualSpent: Record<string, number> = {}
  for (const tx of txRows ?? []) {
    actualSpent[tx.category] = (actualSpent[tx.category] ?? 0) + tx.amount_kes
  }

  // Fetch active ImpulsePause
  const now = new Date().toISOString()
  const { data: pauseRow } = await supabase
    .from('impulse_pauses')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .gt('unlock_at', now)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Fetch savings streak
  const { data: streakRow } = await supabase
    .from('savings_streaks')
    .select('current_streak_days')
    .eq('user_id', user.id)
    .maybeSingle()

  const result = evaluatePurchase(
    { userId: user.id, item, amount_kes, category },
    {
      userId: user.id,
      allocations: allocations as Record<string, number> & typeof allocations,
      actualSpent,
      savingsStreak: { current_streak_days: streakRow?.current_streak_days ?? 0 },
      activePause: pauseRow ?? null,
    }
  )

  let aiReasoning = result.reasoning
  let pause = pauseRow

  if (result.createPause) {
    // Generate Gemini reasoning
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const budgetContext = { allocations, actualSpent, income }
      const geminiResult = await model.generateContent(
        `You are TAWALA, a financial advisor for a young Kenyan professional. The user wants to buy "${item}" for KES ${amount_kes}. Their current budget status: ${JSON.stringify(budgetContext)}. Give a 2-sentence financial reasoning for this decision.`
      )
      aiReasoning = geminiResult.response.text()
    } catch {
      // fallback to core reasoning
    }

    const unlockAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const { data: newPause } = await supabase
      .from('impulse_pauses')
      .insert({
        user_id: user.id,
        item_name: item,
        amount_kes,
        unlock_at: unlockAt,
        status: 'pending',
        ai_reasoning: aiReasoning,
      })
      .select()
      .single()

    pause = newPause
  }

  const decision = {
    approved: result.approved,
    type: result.type,
    reasoning: aiReasoning,
    ...(pause ? { pause } : {}),
    ...(result.warning ? { warning: result.warning } : {}),
    ...(result.remaining !== undefined ? { remaining: result.remaining } : {}),
  }

  return NextResponse.json(decision)
}
