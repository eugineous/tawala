import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface BibleVerseWidgetData {
  reference: string
  text_en: string
  text_sw: string
  date: string
}

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]

  // Try today's assigned verse first
  const { data: todayVerse } = await supabase
    .from('bible_verses')
    .select('reference, text_en, text_sw, date')
    .eq('date', today)
    .maybeSingle()

  if (todayVerse) {
    const widget: BibleVerseWidgetData = {
      reference: todayVerse.reference,
      text_en: todayVerse.text_en,
      text_sw: todayVerse.text_sw,
      date: todayVerse.date,
    }
    return NextResponse.json(widget)
  }

  // Fall back to first verse in table
  const { data: firstVerse } = await supabase
    .from('bible_verses')
    .select('reference, text_en, text_sw, date')
    .order('id')
    .limit(1)
    .maybeSingle()

  if (!firstVerse) {
    return NextResponse.json({ error: 'No verses available' }, { status: 404 })
  }

  const widget: BibleVerseWidgetData = {
    reference: firstVerse.reference,
    text_en: firstVerse.text_en,
    text_sw: firstVerse.text_sw,
    date: firstVerse.date ?? today,
  }
  return NextResponse.json(widget)
}
