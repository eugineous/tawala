import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { assessBurnoutRisk, computeBurnoutLevel } from '@tawala/core'

function startOfPeriod(period: string): string {
  const d = new Date()
  if (period === 'month') d.setDate(d.getDate() - 30)
  else d.setDate(d.getDate() - 7)
  return d.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const { searchParams } = req.nextUrl
  const period = searchParams.get('period') ?? 'week'
  const since = startOfPeriod(period)
  const today = new Date().toISOString().slice(0, 10)
  const midpoint = startOfPeriod('week') // always use last 7 days for habit comparison

  const [moodRes, sleepRes, recentHabitsRes, priorHabitsRes] = await Promise.all([
    supabase
      .from('mood_entries')
      .select('mood, stress, date, created_at')
      .eq('user_id', user.id)
      .gte('date', since)
      .order('date', { ascending: true }),
    supabase
      .from('sleep_entries')
      .select('duration_hours, quality, date')
      .eq('user_id', user.id)
      .gte('date', since),
    supabase
      .from('habit_logs')
      .select('completed')
      .eq('user_id', user.id)
      .gte('date', midpoint)
      .lte('date', today),
    supabase
      .from('habit_logs')
      .select('completed')
      .eq('user_id', user.id)
      .gte('date', startOfPeriod('month'))
      .lt('date', midpoint),
  ])

  const moodEntries = (moodRes.data ?? []) as { mood: number; stress: number; date: string; created_at: string }[]
  const sleepEntries = (sleepRes.data ?? []) as { duration_hours: number; quality: number; date: string }[]
  const recentLogs = (recentHabitsRes.data ?? []) as { completed: boolean }[]
  const priorLogs = (priorHabitsRes.data ?? []) as { completed: boolean }[]

  // Mood trend
  const avgMood =
    moodEntries.length > 0
      ? moodEntries.reduce((s, e) => s + e.mood, 0) / moodEntries.length
      : null

  const avgStress =
    moodEntries.length > 0
      ? moodEntries.reduce((s, e) => s + e.stress, 0) / moodEntries.length
      : null

  // Mood trend direction (compare first half vs second half)
  let moodTrend: 'improving' | 'declining' | 'stable' = 'stable'
  if (moodEntries.length >= 4) {
    const mid = Math.floor(moodEntries.length / 2)
    const firstAvg = moodEntries.slice(0, mid).reduce((s, e) => s + e.mood, 0) / mid
    const secondAvg = moodEntries.slice(mid).reduce((s, e) => s + e.mood, 0) / (moodEntries.length - mid)
    if (secondAvg > firstAvg + 0.3) moodTrend = 'improving'
    else if (secondAvg < firstAvg - 0.3) moodTrend = 'declining'
  }

  // Sleep averages
  const avgSleepHours =
    sleepEntries.length > 0
      ? sleepEntries.reduce((s, e) => s + e.duration_hours, 0) / sleepEntries.length
      : null

  const avgSleepQuality =
    sleepEntries.length > 0
      ? sleepEntries.reduce((s, e) => s + e.quality, 0) / sleepEntries.length
      : null

  // Burnout risk
  const habitCompletionRecent =
    recentLogs.length > 0 ? recentLogs.filter((l) => l.completed).length / recentLogs.length : 1
  const habitCompletionPrior =
    priorLogs.length > 0 ? priorLogs.filter((l) => l.completed).length / priorLogs.length : 1

  const { score: burnoutScore, factors } = assessBurnoutRisk({
    moodEntries,
    sleepEntries,
    habitCompletionRecent,
    habitCompletionPrior,
    avgStress: avgStress ?? 1,
  })
  const burnoutLevel = computeBurnoutLevel(burnoutScore)

  return NextResponse.json({
    period,
    mood: {
      avg: avgMood !== null ? Math.round(avgMood * 10) / 10 : null,
      avg_stress: avgStress !== null ? Math.round(avgStress * 10) / 10 : null,
      trend: moodTrend,
      entries_count: moodEntries.length,
    },
    sleep: {
      avg_hours: avgSleepHours !== null ? Math.round(avgSleepHours * 10) / 10 : null,
      avg_quality: avgSleepQuality !== null ? Math.round(avgSleepQuality * 10) / 10 : null,
      entries_count: sleepEntries.length,
    },
    burnout: {
      score: burnoutScore,
      level: burnoutLevel,
      factors,
    },
  })
}
