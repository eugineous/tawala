import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const body = await req.json()
  const { situation, automatic_thought, emotion, cognitive_distortion, rational_response } = body

  if (!situation || !automatic_thought || !emotion) {
    return NextResponse.json(
      { error: 'situation, automatic_thought, and emotion are required' },
      { status: 400 }
    )
  }

  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('cbt_entries')
    .insert({
      user_id: user.id,
      situation,
      automatic_thought,
      emotion,
      cognitive_distortion: cognitive_distortion ?? null,
      rational_response: rational_response ?? null,
      date: today,
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
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = parseInt(searchParams.get('limit') ?? '20', 10)
  const offset = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('cbt_entries')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ entries: data ?? [], total: count ?? 0, page, limit })
}
