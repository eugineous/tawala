import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const body = await req.json()
  const { amount_kes, type, category, description, date, mpesa_ref } = body

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      amount_kes,
      type,
      category,
      description,
      date,
      mpesa_ref: mpesa_ref ?? null,
      source: 'manual',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = parseInt(searchParams.get('limit') ?? '20', 10)
  const month = searchParams.get('month') // YYYY-MM

  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .range(from, to)

  if (month) {
    query = query
      .gte('date', `${month}-01`)
      .lt('date', `${month}-32`)
  }

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ transactions: data, total: count ?? 0, page })
}
