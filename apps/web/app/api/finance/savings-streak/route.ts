import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const DEFAULT_STREAK = {
  current_streak_days: 0,
  longest_streak_days: 0,
  total_saved_kes: 0,
}

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()

  const { data } = await supabase
    .from('savings_streaks')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json(data ?? { ...DEFAULT_STREAK, user_id: user.id })
}

export async function POST(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()

  const { data: existing } = await supabase
    .from('savings_streaks')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const today = new Date().toISOString().slice(0, 10)

  if (!existing) {
    // Create new streak record
    const { data: created } = await supabase
      .from('savings_streaks')
      .insert({
        user_id: user.id,
        current_streak_days: 1,
        longest_streak_days: 1,
        last_savings_date: today,
        total_saved_kes: 0,
      })
      .select()
      .single()
    return NextResponse.json(created)
  }

  const lastDate = existing.last_savings_date
    ? new Date(existing.last_savings_date)
    : null

  const todayDate = new Date(today)
  let newStreak = existing.current_streak_days

  if (lastDate) {
    const diffMs = todayDate.getTime() - lastDate.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      // Consecutive day — increment
      newStreak = existing.current_streak_days + 1
    } else if (diffDays > 1) {
      // Gap — reset
      newStreak = 1
    }
    // diffDays === 0 means same day, no change
  } else {
    newStreak = 1
  }

  const newLongest = Math.max(newStreak, existing.longest_streak_days ?? 0)

  const { data: updated } = await supabase
    .from('savings_streaks')
    .update({
      current_streak_days: newStreak,
      longest_streak_days: newLongest,
      last_savings_date: today,
    })
    .eq('user_id', user.id)
    .select()
    .single()

  return NextResponse.json(updated)
}
