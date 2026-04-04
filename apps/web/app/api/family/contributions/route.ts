import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const body = await req.json()
  const { person_name, amount_kes, description, date } = body

  if (!person_name || typeof person_name !== 'string' || person_name.trim() === '') {
    return NextResponse.json({ error: 'person_name is required' }, { status: 400 })
  }
  if (!amount_kes || typeof amount_kes !== 'number' || amount_kes <= 0) {
    return NextResponse.json({ error: 'amount_kes must be a positive number' }, { status: 400 })
  }
  if (!description || typeof description !== 'string' || description.trim() === '') {
    return NextResponse.json({ error: 'description is required' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('family_contributions')
    .insert({
      user_id: user.id,
      person_name: person_name.trim(),
      amount_kes,
      description: description.trim(),
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

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)

  // Validate YYYY-MM format
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month must be in YYYY-MM format' }, { status: 400 })
  }

  const startDate = `${month}-01`
  const [year, mon] = month.split('-').map(Number)
  const endDate = new Date(year, mon, 0).toISOString().slice(0, 10) // last day of month

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('family_contributions')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const contributions = data ?? []
  const total_kes = contributions.reduce((sum: number, c: { amount_kes: number }) => sum + c.amount_kes, 0)

  return NextResponse.json({ month, total_kes, contributions })
}
