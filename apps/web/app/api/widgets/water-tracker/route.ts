import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface WaterTrackerWidgetData {
  water_ml: number
  water_target_ml: number
  percent: number
}

const WATER_TARGET_ML = 3000

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: logs } = await supabase
    .from('water_logs')
    .select('amount_ml')
    .eq('user_id', user.id)
    .eq('date', today)

  const water_ml = (logs ?? []).reduce((sum, l) => sum + (l.amount_ml ?? 0), 0)
  const percent = Math.min(100, Math.round((water_ml / WATER_TARGET_ML) * 100))

  const widget: WaterTrackerWidgetData = {
    water_ml,
    water_target_ml: WATER_TARGET_ML,
    percent,
  }

  return NextResponse.json(widget)
}
