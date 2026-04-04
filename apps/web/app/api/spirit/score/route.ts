import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { scoreSpiritData } from '@tawala/core'

function getCurrentWeek(): string {
  const now = new Date()
  const year = now.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1
  const week = Math.ceil(dayOfYear / 7)
  return `${year}-${String(week).padStart(2, '0')}`
}

function getWeekDateRange(week: string): { start: string; end: string } {
  const [yearStr, weekStr] = week.split('-')
  const year = parseInt(yearStr)
  const weekNum = parseInt(weekStr)
  const startOfYear = new Date(year, 0, 1)
  const startDate = new Date(startOfYear)
  startDate.setDate(startOfYear.getDate() + (weekNum - 1) * 7)
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6)
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
  }
}

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const week = req.nextUrl.searchParams.get('week') ?? getCurrentWeek()
  const { start, end } = getWeekDateRange(week)

  // Count verse streak: consecutive days with a verse viewed (bible_verses with date in range)
  const { data: verseData } = await supabase
    .from('bible_verses')
    .select('date')
    .gte('date', start)
    .lte('date', end)
    .not('date', 'is', null)

  const verseDays = new Set((verseData ?? []).map((v: { date: string }) => v.date))
  let verseStreak = 0
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    if (verseDays.has(ds)) verseStreak++
    else break
  }

  // Prayer streak: days with a cached prayer in the week
  const { data: prayerData } = await supabase
    .from('ai_cache')
    .select('cache_key')
    .eq('user_id', user.id)
    .like('cache_key', 'prayer_%')

  const prayerDays = new Set(
    (prayerData ?? [])
      .map((p: { cache_key: string }) => p.cache_key.split('_').pop() ?? '')
      .filter((d: string) => d >= start && d <= end)
  )
  let prayerStreak = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    if (prayerDays.has(ds)) prayerStreak++
    else break
  }

  // Memory reviews this week
  const { data: reviewData } = await supabase
    .from('memory_verses')
    .select('id')
    .eq('user_id', user.id)
    .gte('last_reviewed', start)
    .lte('last_reviewed', end)

  const memoryReviews = (reviewData ?? []).length

  // Gratitude entries this week
  const { data: gratitudeData } = await supabase
    .from('gratitude_entries')
    .select('id')
    .eq('user_id', user.id)
    .gte('date', start)
    .lte('date', end)

  const gratitudeEntries = (gratitudeData ?? []).length

  // Calculate score
  const score = scoreSpiritData({ verseStreak, prayerStreak, memoryReviews, gratitudeEntries })

  // Upsert to spirit_scores
  const { data: spiritScore, error } = await supabase
    .from('spirit_scores')
    .upsert(
      {
        user_id: user.id,
        week,
        verse_streak: verseStreak,
        prayer_streak: prayerStreak,
        memory_reviews: memoryReviews,
        gratitude_entries: gratitudeEntries,
        score,
      },
      { onConflict: 'user_id,week' }
    )
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(spiritScore)
}
