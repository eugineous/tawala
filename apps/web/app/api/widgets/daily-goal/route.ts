import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface DailyGoalWidgetData {
  primary_goal_title: string | null
  progress_percent: number
  habits_completed_today: number
  habits_total: number
}

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]
  const month = today.slice(0, 7)

  // Primary goal for current month
  const { data: primaryGoal } = await supabase
    .from('goals')
    .select('title, progress_percent')
    .eq('user_id', user.id)
    .eq('month', month)
    .eq('is_primary', true)
    .eq('status', 'active')
    .maybeSingle()

  // All daily habits
  const { data: habits } = await supabase
    .from('habits')
    .select('id')
    .eq('user_id', user.id)
    .eq('frequency', 'daily')

  const habitIds = (habits ?? []).map((h: { id: string }) => h.id)
  const habits_total = habitIds.length

  // Habits completed today
  let habits_completed_today = 0
  if (habitIds.length > 0) {
    const { data: logs } = await supabase
      .from('habit_logs')
      .select('habit_id')
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('completed', true)
      .in('habit_id', habitIds)

    habits_completed_today = (logs ?? []).length
  }

  const widget: DailyGoalWidgetData = {
    primary_goal_title: primaryGoal?.title ?? null,
    progress_percent: primaryGoal?.progress_percent ?? 0,
    habits_completed_today,
    habits_total,
  }

  return NextResponse.json(widget)
}
