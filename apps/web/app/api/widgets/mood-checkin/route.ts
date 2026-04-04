import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface MoodCheckinWidgetData {
  today_mood: number | null
  today_stress: number | null
  last_logged: string | null
}

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]

  // Most recent mood entry for today
  const { data: entry } = await supabase
    .from('mood_entries')
    .select('mood, stress, created_at')
    .eq('user_id', user.id)
    .eq('date', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const widget: MoodCheckinWidgetData = {
    today_mood: entry?.mood ?? null,
    today_stress: entry?.stress ?? null,
    last_logged: entry?.created_at ?? null,
  }

  return NextResponse.json(widget)
}
