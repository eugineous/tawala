import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const { id } = await params
  const body = await req.json()
  const { completed, note } = body
  const date = body.date ?? new Date().toISOString().slice(0, 10)

  // Upsert the log
  const { data: log, error: logError } = await supabase
    .from('habit_logs')
    .upsert(
      { habit_id: id, user_id: user.id, date, completed, note: note ?? null },
      { onConflict: 'habit_id,date' }
    )
    .select()
    .single()

  if (logError) return NextResponse.json({ error: logError.message }, { status: 400 })

  // Fetch current habit streak info
  const { data: habit } = await supabase
    .from('habits')
    .select('current_streak, longest_streak')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  let newStreak = habit?.current_streak ?? 0

  if (completed) {
    // Check yesterday's log
    const yesterday = new Date(date)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().slice(0, 10)

    const { data: yesterdayLog } = await supabase
      .from('habit_logs')
      .select('completed')
      .eq('habit_id', id)
      .eq('date', yesterdayStr)
      .single()

    newStreak = yesterdayLog?.completed ? (habit?.current_streak ?? 0) + 1 : 1

    const newLongest = Math.max(newStreak, habit?.longest_streak ?? 0)

    await supabase
      .from('habits')
      .update({ current_streak: newStreak, longest_streak: newLongest })
      .eq('id', id)
      .eq('user_id', user.id)

    // Award 10 XP
    await supabase.rpc('increment_xp', { p_user_id: user.id, p_xp: 10 }).maybeSingle()
  }

  return NextResponse.json({ log, streak: newStreak })
}
