import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Returns the ISO week string for the current date in YYYY-WW format
function getCurrentISOWeek(): string {
  const date = new Date()
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-${String(weekNo).padStart(2, '0')}`
}

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const week = getCurrentISOWeek()

  // Fetch only aggregate LifeScore fields — no raw financial, health, or spiritual data
  const { data, error } = await supabase
    .from('life_scores')
    .select('user_id, overall_score, trend, week')
    .eq('week', week)
    .order('overall_score', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const scores = data ?? []

  // Fetch display names for users on the leaderboard
  const userIds = scores.map((s: { user_id: string }) => s.user_id)

  let displayNames: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)

    if (profiles) {
      for (const p of profiles as { id: string; full_name: string }[]) {
        displayNames[p.id] = p.full_name
      }
    }
  }

  // Return only aggregate LifeScore fields — no raw data
  const leaderboard = scores.map((s: { user_id: string; overall_score: number; trend: string; week: string }) => ({
    user_id: s.user_id,
    display_name: displayNames[s.user_id] ?? 'Anonymous',
    overall_score: s.overall_score,
    trend: s.trend,
    week: s.week,
  }))

  return NextResponse.json(leaderboard)
}
