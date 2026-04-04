import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const body = await req.json()
  const { name, date, type, person_name } = body

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be in YYYY-MM-DD format' }, { status: 400 })
  }
  if (!type || !['birthday', 'anniversary', 'other'].includes(type)) {
    return NextResponse.json({ error: 'type must be birthday, anniversary, or other' }, { status: 400 })
  }
  if (!person_name || typeof person_name !== 'string' || person_name.trim() === '') {
    return NextResponse.json({ error: 'person_name is required' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('important_dates')
    .insert({
      user_id: user.id,
      name: name.trim(),
      date,
      type,
      person_name: person_name.trim(),
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
    .from('important_dates')
    .select('*')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const today = new Date()
  const todayMonth = today.getMonth() + 1 // 1-12
  const todayDay = today.getDate()

  // Calculate days_until for each date (recurring annual, compare month+day)
  const upcoming = (data ?? [])
    .map((entry: { id: string; name: string; date: string; type: string; person_name: string; created_at: string }) => {
      const [, entryMonth, entryDay] = entry.date.split('-').map(Number)

      // Days until next occurrence of this month+day
      let daysUntil: number
      const thisYearDate = new Date(today.getFullYear(), entryMonth - 1, entryDay)
      const diff = Math.floor((thisYearDate.getTime() - new Date(today.getFullYear(), todayMonth - 1, todayDay).getTime()) / 86400000)

      if (diff < 0) {
        // Already passed this year — next occurrence is next year
        const nextYearDate = new Date(today.getFullYear() + 1, entryMonth - 1, entryDay)
        daysUntil = Math.floor((nextYearDate.getTime() - new Date(today.getFullYear(), todayMonth - 1, todayDay).getTime()) / 86400000)
      } else {
        daysUntil = diff
      }

      return { ...entry, days_until: daysUntil }
    })
    .filter((entry: { days_until: number }) => entry.days_until <= 30)
    .sort((a: { days_until: number }, b: { days_until: number }) => a.days_until - b.days_until)

  return NextResponse.json({ upcoming })
}
