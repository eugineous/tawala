import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const body = await req.json()
  const { content } = body

  if (!content || typeof content !== 'string' || content.trim() === '') {
    return NextResponse.json({ error: 'content is required and must be non-empty' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('gratitude_entries')
    .insert({
      user_id: user.id,
      content: content.trim(),
      date: today,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const { searchParams } = req.nextUrl
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  let query = supabase
    .from('gratitude_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  if (start) query = query.gte('date', start)
  if (end) query = query.lte('date', end)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entries: data ?? [] })
}
