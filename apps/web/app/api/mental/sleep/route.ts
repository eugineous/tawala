import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

function calcDurationHours(bedtime: string, wake_time: string): number {
  const bed = new Date(`1970-01-01T${bedtime}:00`)
  let wake = new Date(`1970-01-01T${wake_time}:00`)
  // Handle overnight sleep (wake < bed means next day)
  if (wake <= bed) wake = new Date(`1970-01-02T${wake_time}:00`)
  return (wake.getTime() - bed.getTime()) / (1000 * 60 * 60)
}

export async function POST(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const body = await req.json()
  const { bedtime, wake_time, quality, notes, date } = body

  if (!bedtime || !wake_time) {
    return NextResponse.json({ error: 'bedtime and wake_time are required (HH:MM)' }, { status: 400 })
  }
  if (!quality || quality < 1 || quality > 5) {
    return NextResponse.json({ error: 'quality must be 1–5' }, { status: 400 })
  }

  const duration_hours = calcDurationHours(bedtime, wake_time)
  const supabase = await createServerSupabaseClient()
  const entryDate = date ?? new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('sleep_entries')
    .insert({
      user_id: user.id,
      date: entryDate,
      bedtime,
      wake_time,
      duration_hours,
      quality,
      notes: notes ?? null,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const { searchParams } = req.nextUrl
  const start_date = searchParams.get('start_date')
  const end_date = searchParams.get('end_date')

  let query = supabase
    .from('sleep_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  if (start_date) query = query.gte('date', start_date)
  if (end_date) query = query.lte('date', end_date)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ entries: data ?? [] })
}
