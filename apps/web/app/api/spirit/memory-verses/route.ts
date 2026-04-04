import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('memory_verses')
    .select(`
      id,
      user_id,
      verse_id,
      ease_factor,
      interval_days,
      next_review,
      repetitions,
      last_reviewed,
      verse:bible_verses (
        id,
        reference,
        text_en,
        text_sw,
        theme,
        date
      )
    `)
    .eq('user_id', user.id)
    .lte('next_review', today)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ verses: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const body = await req.json()
  const { verse_id } = body

  if (!verse_id) {
    return NextResponse.json({ error: 'verse_id is required' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  // Verify verse exists
  const { data: verse, error: verseError } = await supabase
    .from('bible_verses')
    .select('id')
    .eq('id', verse_id)
    .single()

  if (verseError || !verse) {
    return NextResponse.json({ error: 'Verse not found' }, { status: 404 })
  }

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('memory_verses')
    .insert({
      user_id: user.id,
      verse_id,
      ease_factor: 2.5,
      interval_days: 1,
      repetitions: 0,
      next_review: today,
      last_reviewed: null,
    })
    .select(`
      id,
      user_id,
      verse_id,
      ease_factor,
      interval_days,
      next_review,
      repetitions,
      last_reviewed,
      verse:bible_verses (
        id,
        reference,
        text_en,
        text_sw,
        theme,
        date
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
