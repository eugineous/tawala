import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const body = await req.json()
  const { person_name, method, notes, date } = body

  if (!person_name || typeof person_name !== 'string' || person_name.trim() === '') {
    return NextResponse.json({ error: 'person_name is required' }, { status: 400 })
  }
  if (!method || !['call', 'visit', 'message'].includes(method)) {
    return NextResponse.json({ error: 'method must be call, visit, or message' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('family_checkins')
    .insert({
      user_id: user.id,
      person_name: person_name.trim(),
      method,
      notes: notes?.trim() ?? null,
      date: date ?? today,
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

  const { data, error } = await supabase
    .from('family_checkins')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ checkins: data ?? [] })
}
