import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { reviewMemoryVerse } from '@tawala/core'
import type { MemoryVerse } from '@tawala/core'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const { id } = await params
  const body = await req.json()
  const { quality } = body

  if (quality === undefined || quality === null || ![0, 1, 2, 3, 4, 5].includes(quality)) {
    return NextResponse.json({ error: 'quality must be 0-5' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  // Fetch the memory verse with its bible verse data
  const { data: memVerse, error: fetchError } = await supabase
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
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !memVerse) {
    return NextResponse.json({ error: 'Memory verse not found' }, { status: 404 })
  }

  // Supabase returns joined relation as array; normalize to single object
  const verseRaw = Array.isArray(memVerse.verse) ? memVerse.verse[0] : memVerse.verse
  const normalizedVerse: MemoryVerse = { ...memVerse, verse: verseRaw }

  // Apply SM-2 algorithm
  const updated = reviewMemoryVerse(normalizedVerse, quality as 0 | 1 | 2 | 3 | 4 | 5)

  // Update in database
  const { data: saved, error: updateError } = await supabase
    .from('memory_verses')
    .update({
      ease_factor: updated.ease_factor,
      interval_days: updated.interval_days,
      next_review: updated.next_review,
      repetitions: updated.repetitions,
      last_reviewed: updated.last_reviewed,
    })
    .eq('id', id)
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

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Award XP
  try {
    await fetch(`${req.nextUrl.origin}/api/gamification/xp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: req.headers.get('authorization') ?? '',
        cookie: req.headers.get('cookie') ?? '',
      },
      body: JSON.stringify({ action: 'review_verse', module: 'spirit', xp_value: 15 }),
    })
  } catch {
    // XP award failure is non-critical
  }

  return NextResponse.json(saved)
}
