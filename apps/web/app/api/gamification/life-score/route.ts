import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { computeOverallScore, computeLifeScoreTrend } from '@tawala/core'

// Returns the ISO week string for a given date in YYYY-WW format
function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-${String(weekNo).padStart(2, '0')}`
}

// Returns start/end dates (YYYY-MM-DD) for a given YYYY-WW week string
function weekBounds(week: string): { start: string; end: string } {
  const [yearStr, weekStr] = week.split('-')
  const year = parseInt(yearStr, 10)
  const weekNum = parseInt(weekStr, 10)

  // Jan 4 is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const weekStart = new Date(jan4.getTime() - (jan4Day - 1) * 86400000 + (weekNum - 1) * 7 * 86400000)
  const weekEnd = new Date(weekStart.getTime() + 6 * 86400000)

  return {
    start: weekStart.toISOString().slice(0, 10),
    end: weekEnd.toISOString().slice(0, 10),
  }
}

// Score finance module: budget adherence (actual_spent vs allocations)
function scoreFinance(budgetData: { allocations?: Record<string, number>; actual_spent?: Record<string, number> } | null): number {
  if (!budgetData?.allocations || !budgetData?.actual_spent) return 50
  const categories = Object.keys(budgetData.allocations)
  if (categories.length === 0) return 50

  let adherentCount = 0
  for (const cat of categories) {
    const allocated = budgetData.allocations[cat] ?? 0
    const spent = budgetData.actual_spent[cat] ?? 0
    if (allocated > 0 && spent <= allocated) adherentCount++
    else if (allocated === 0) adherentCount++ // no budget = no overspend
  }
  return Math.round((adherentCount / categories.length) * 100)
}

// Score keto module: macro adherence + ketosis
function scoreKeto(ketoData: { ketosis_status?: { estimated_score?: number }; actual?: { net_carbs_g?: number }; target?: { net_carbs_g?: number } } | null): number {
  if (!ketoData) return 50
  const ketosisScore = ketoData.ketosis_status?.estimated_score ?? 50
  const targetCarbs = ketoData.target?.net_carbs_g ?? 20
  const actualCarbs = ketoData.actual?.net_carbs_g ?? targetCarbs
  const carbAdherence = actualCarbs <= targetCarbs ? 100 : Math.max(0, 100 - (actualCarbs - targetCarbs) * 2)
  return Math.round((ketosisScore * 0.6 + carbAdherence * 0.4))
}

// Score spirit module: verse streak + prayer streak + memory reviews + gratitude entries
function scoreSpirit(spiritData: { verse_streak?: number; prayer_streak?: number; memory_reviews?: number; gratitude_entries?: number } | null): number {
  if (!spiritData) return 50
  const verseScore = Math.min(100, (spiritData.verse_streak ?? 0) * 14)
  const prayerScore = Math.min(100, (spiritData.prayer_streak ?? 0) * 14)
  const reviewScore = Math.min(100, (spiritData.memory_reviews ?? 0) * 20)
  const gratitudeScore = Math.min(100, (spiritData.gratitude_entries ?? 0) * 14)
  return Math.round((verseScore + prayerScore + reviewScore + gratitudeScore) / 4)
}

// Score goals module: habit completion rate + goal progress
function scoreGoals(goalsData: { habit_completion_rate?: number; avg_goal_progress?: number } | null): number {
  if (!goalsData) return 50
  const habitScore = Math.round((goalsData.habit_completion_rate ?? 0.5) * 100)
  const goalScore = Math.round(goalsData.avg_goal_progress ?? 50)
  return Math.round((habitScore + goalScore) / 2)
}

// Score mental module: mood trend + sleep quality
function scoreMental(mentalData: { avg_mood?: number; avg_sleep_quality?: number } | null): number {
  if (!mentalData) return 50
  const moodScore = Math.round(((mentalData.avg_mood ?? 3) / 5) * 100)
  const sleepScore = Math.round(((mentalData.avg_sleep_quality ?? 3) / 5) * 100)
  return Math.round((moodScore + sleepScore) / 2)
}

// Score family module: contributions + check-ins
function scoreFamily(familyData: { contribution_count?: number; checkin_count?: number } | null): number {
  if (!familyData) return 50
  const contribScore = Math.min(100, (familyData.contribution_count ?? 0) * 25)
  const checkinScore = Math.min(100, (familyData.checkin_count ?? 0) * 14)
  return Math.round((contribScore + checkinScore) / 2)
}

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const { searchParams } = req.nextUrl
  const weekParam = searchParams.get('week')

  // Validate or default week
  let week: string
  if (weekParam) {
    if (!/^\d{4}-\d{2}$/.test(weekParam)) {
      return NextResponse.json({ error: 'week must be in YYYY-WW format' }, { status: 400 })
    }
    week = weekParam
  } else {
    week = getISOWeek(new Date())
  }

  const { start, end } = weekBounds(week)
  const supabase = await createServerSupabaseClient()

  // Fetch all module data in parallel
  const [
    budgetRes,
    ketoRes,
    spiritRes,
    habitsRes,
    goalsRes,
    moodRes,
    sleepRes,
    familyContribRes,
    familyCheckinRes,
    prevScoreRes,
  ] = await Promise.all([
    // Finance: budget allocation for the month
    supabase
      .from('budget_allocations')
      .select('allocations, actual_spent')
      .eq('user_id', user.id)
      .eq('month', start.slice(0, 7))
      .maybeSingle(),

    // Keto: daily macros for the week
    supabase
      .from('daily_macros')
      .select('ketosis_status, actual, target')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end),

    // Spirit: spirit score for the week
    supabase
      .from('spirit_scores')
      .select('verse_streak, prayer_streak, memory_reviews, gratitude_entries')
      .eq('user_id', user.id)
      .eq('week', week)
      .maybeSingle(),

    // Goals: habit logs for the week
    supabase
      .from('habit_logs')
      .select('completed')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end),

    // Goals: goal progress for the month
    supabase
      .from('goals')
      .select('progress_percent')
      .eq('user_id', user.id)
      .eq('month', start.slice(0, 7))
      .eq('status', 'active'),

    // Mental: mood entries for the week
    supabase
      .from('mood_entries')
      .select('mood')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end),

    // Mental: sleep entries for the week
    supabase
      .from('sleep_entries')
      .select('quality')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end),

    // Family: contributions for the week
    supabase
      .from('family_contributions')
      .select('id')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end),

    // Family: check-ins for the week
    supabase
      .from('family_checkins')
      .select('id')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end),

    // Previous week's life score for trend
    supabase
      .from('life_scores')
      .select('overall_score')
      .eq('user_id', user.id)
      .neq('week', week)
      .order('week', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // Aggregate keto data (average across the week)
  const ketoRows = ketoRes.data ?? []
  const avgKetoData = ketoRows.length > 0
    ? {
        ketosis_status: {
          estimated_score:
            ketoRows.reduce((s: number, r: { ketosis_status?: { estimated_score?: number } }) => s + (r.ketosis_status?.estimated_score ?? 50), 0) / ketoRows.length,
        },
        actual: {
          net_carbs_g:
            ketoRows.reduce((s: number, r: { actual?: { net_carbs_g?: number } }) => s + (r.actual?.net_carbs_g ?? 20), 0) / ketoRows.length,
        },
        target: {
          net_carbs_g: 20,
        },
      }
    : null

  // Aggregate goals data
  const habitLogs = habitsRes.data ?? []
  const totalHabits = habitLogs.length
  const completedHabits = habitLogs.filter((h: { completed: boolean }) => h.completed).length
  const habitCompletionRate = totalHabits > 0 ? completedHabits / totalHabits : 0.5

  const goalRows = goalsRes.data ?? []
  const avgGoalProgress = goalRows.length > 0
    ? goalRows.reduce((s: number, g: { progress_percent: number }) => s + g.progress_percent, 0) / goalRows.length
    : 50

  // Aggregate mental data
  const moodRows = moodRes.data ?? []
  const avgMood = moodRows.length > 0
    ? moodRows.reduce((s: number, m: { mood: number }) => s + m.mood, 0) / moodRows.length
    : 3

  const sleepRows = sleepRes.data ?? []
  const avgSleepQuality = sleepRows.length > 0
    ? sleepRows.reduce((s: number, sl: { quality: number }) => s + sl.quality, 0) / sleepRows.length
    : 3

  // Compute module scores
  const finance_score = scoreFinance(budgetRes.data)
  const keto_score = scoreKeto(avgKetoData)
  const spirit_score = scoreSpirit(spiritRes.data)
  const goals_score = scoreGoals({ habit_completion_rate: habitCompletionRate, avg_goal_progress: avgGoalProgress })
  const mental_health_score = scoreMental({ avg_mood: avgMood, avg_sleep_quality: avgSleepQuality })
  const family_score = scoreFamily({
    contribution_count: (familyContribRes.data ?? []).length,
    checkin_count: (familyCheckinRes.data ?? []).length,
  })

  // Compute overall score using core function
  const overall_score = computeOverallScore({
    finance: finance_score,
    keto: keto_score,
    spirit: spirit_score,
    goals: goals_score,
    mental: mental_health_score,
    family: family_score,
  })

  // Compute trend vs previous week
  const prevScore = prevScoreRes.data?.overall_score ?? overall_score
  const trend = computeLifeScoreTrend(overall_score, prevScore)

  const lifeScore = {
    user_id: user.id,
    week,
    finance_score,
    keto_score,
    spirit_score,
    goals_score,
    mental_health_score,
    family_score,
    overall_score,
    trend,
  }

  // Upsert to life_scores table
  await supabase
    .from('life_scores')
    .upsert(lifeScore, { onConflict: 'user_id,week' })

  return NextResponse.json(lifeScore)
}
