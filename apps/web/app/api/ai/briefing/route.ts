import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { aiOrchestrator } from '@/lib/ai/orchestrator'

// GET — return cached or freshly generated DailyBriefing
export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().slice(0, 10)
  const cacheKey = `briefing:${user.id}:${today}`

  // Check cache
  const { data: cached } = await supabase
    .from('ai_cache')
    .select('value, created_at')
    .eq('key', cacheKey)
    .single()

  if (cached) {
    const ageMs = Date.now() - new Date(cached.created_at).getTime()
    if (ageMs < 6 * 60 * 60 * 1000) {
      return NextResponse.json(cached.value)
    }
  }

  const briefing = await aiOrchestrator.generateDailyBriefing(user.id)
  return NextResponse.json(briefing)
}

// POST — pregenerate cron (no JWT required)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const userId: string | undefined = body?.userId

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const briefing = await aiOrchestrator.generateDailyBriefing(userId)
  return NextResponse.json({ success: true, briefing })
}
