import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]
  const cacheKey = `prayer_${user.id}_${today}`

  // Check cache
  const { data: cached } = await supabase
    .from('ai_cache')
    .select('response, expires_at')
    .eq('user_id', user.id)
    .eq('cache_key', cacheKey)
    .single()

  if (cached && new Date(cached.expires_at) > new Date()) {
    return NextResponse.json(cached.response)
  }

  // Generate with Gemini
  let prayer: string
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent(
      'Generate a short, heartfelt 5-minute morning prayer prompt for a young Kenyan Christian professional. Include thanksgiving, intercession for family, and focus for the day. Keep it under 150 words.'
    )
    prayer = result.response.text().trim()
  } catch (err) {
    console.error('Gemini prayer error:', err)
    return NextResponse.json({ error: 'Failed to generate prayer' }, { status: 500 })
  }

  // Cache for 24 hours
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 24)

  await supabase.from('ai_cache').upsert(
    {
      user_id: user.id,
      cache_key: cacheKey,
      response: { prayer },
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: 'user_id,cache_key' }
  )

  return NextResponse.json({ prayer })
}
