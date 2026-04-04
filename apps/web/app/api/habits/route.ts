import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const body = await req.json()
  const { name, frequency, module, is_morning_routine } = body

  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: user.id,
      name,
      frequency,
      module,
      is_morning_routine: is_morning_routine ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const { searchParams } = new URL(req.url)
  const module = searchParams.get('module')

  let query = supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .order('order', { ascending: true })

  if (module) query = query.eq('module', module)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ habits: data })
}
