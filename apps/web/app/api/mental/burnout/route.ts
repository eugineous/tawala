import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { assessBurnoutRisk, computeBurnoutLevel } from '@tawala/core'
import type { BurnoutRisk } from '@tawala/core'

const LOOKBACK_DAYS = 14

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

async function generateRecommendations(
  level: BurnoutRisk['level'],
  factors: string[]
): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return defaultRecommendations(level)

  try {
    const prompt = `You are a mental health advisor. A user has a burnout risk level of "${level}" with these contributing factors: ${factors.join(', ')}. 
Provide 3 concise, actionable recommendations to reduce burnout risk. Return as a JSON array of strings.`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    )

    if (!res.ok) return defaultRecommendations(level)

    const json = await res.json()
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch {
    // fall through to defaults
  }

  return defaultRecommendations(level)
}

function defaultRecommendations(level: BurnoutRisk['level']): string[] {
  if (level === 'critical') {
    return [
      'Take an immediate rest day — step away from all obligations',
      'Talk to a trusted friend or counselor today',
      'Reduce your habit targets by 50% for the next week',
    ]
  }
  if (level === 'high') {
    return [
      'Prioritize 8 hours of sleep for the next 7 days',
      'Remove one non-essential commitment from your schedule',
      'Practice 10 minutes of deep breathing or prayer daily',
    ]
  }
  if (level === 'moderate') {
    return [
      'Aim for consistent sleep and wake times',
      'Log your mood daily to track patterns',
      'Celebrate small wins to rebuild momentum',
    ]
  }
  return [
    'Keep up your current healthy habits',
    'Continue logging mood and sleep for early warning',
    'Stay connected with your support network',
  ]
}

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const since = daysAgo(LOOKBACK_DAYS)
  const midpoint = daysAgo(7)
  const today = new Date().toISOString().slice(0, 10)

  // Fetch all required data in parallel
  const [moodRes, sleepRes, habitLogsRecentRes, habitLogsPriorRes] = await Promise.all([
    supabase
      .from('mood_entries')
      .select('mood, stress, created_at')
      .eq('user_id', user.id)
      .gte('date', since)
      .order('date', { ascending: true }),
    supabase
      .from('sleep_entries')
      .select('duration_hours')
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
      .gte('date', since)
      .lt('date', midpoint),
  ])

  const moodEntries = (moodRes.data ?? []) as { mood: number; stress: number; created_at: string }[]
  const sleepEntries = (sleepRes.data ?? []) as { duration_hours: number }[]
  const recentLogs = (habitLogsRecentRes.data ?? []) as { completed: boolean }[]
  const priorLogs = (habitLogsPriorRes.data ?? []) as { completed: boolean }[]

  const habitCompletionRecent =
    recentLogs.length > 0
      ? recentLogs.filter((l) => l.completed).length / recentLogs.length
      : 1

  const habitCompletionPrior =
    priorLogs.length > 0
      ? priorLogs.filter((l) => l.completed).length / priorLogs.length
      : 1

  const avgStress =
    moodEntries.length > 0
      ? moodEntries.reduce((s, e) => s + e.stress, 0) / moodEntries.length
      : 1

  const { score, factors } = assessBurnoutRisk({
    moodEntries,
    sleepEntries,
    habitCompletionRecent,
    habitCompletionPrior,
    avgStress,
  })

  const level = computeBurnoutLevel(score)
  const recommendations = await generateRecommendations(level, factors)

  const result: BurnoutRisk = {
    user_id: user.id,
    score,
    level,
    factors,
    recommendations,
    assessed_at: new Date().toISOString(),
  }

  return NextResponse.json(result)
}
