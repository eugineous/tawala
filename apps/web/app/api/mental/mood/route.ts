import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const body = await req.json()
  const { mood, stress, note, date, time_of_day } = body

  if (!mood || mood < 1 || mood > 5) {
    return NextResponse.json({ error: 'mood must be 1–5' }, { status: 400 })
  }
  if (!stress || stress < 1 || stress > 5) {
    return NextResponse.json({ error: 'stress must be 1–5' }, { status: 400 })
  }
  if (!['morning', 'afternoon', 'evening'].includes(time_of_day)) {
    return NextResponse.json({ error: 'time_of_day must be morning, afternoon, or evening' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const entryDate = date ?? new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('mood_entries')
    .insert({
      user_id: user.id,
      mood,
      stress,
      note: note ?? null,
      date: entryDate,
      time_of_day,
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
    .from('mood_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  if (start_date) query = query.gte('date', start_date)
  if (end_date) query = query.lte('date', end_date)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ entries: data ?? [] })
}
