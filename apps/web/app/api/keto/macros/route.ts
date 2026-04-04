import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { calculateKetosisStatus } from '@tawala/core'
import type { FoodLogEntry } from '@tawala/core'

function getTodayEAT(): string {
  // East Africa Time = UTC+3
  const now = new Date()
  const eat = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  return eat.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const date = req.nextUrl.searchParams.get('date') ?? getTodayEAT()

  // Fetch food logs for the date
  const { data: logs } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)

  // Sum macros from logs
  const actual = (logs ?? []).reduce(
    (acc, log) => {
      const m = log.total_macros ?? {}
      return {
        fat_g: acc.fat_g + (m.fat_g || 0),
        protein_g: acc.protein_g + (m.protein_g || 0),
        carbs_g: acc.carbs_g + (m.carbs_g || 0),
        calories: acc.calories + (m.calories || 0),
        net_carbs_g: acc.net_carbs_g + (m.net_carbs_g || 0),
        ketosis_impact: m.ketosis_impact ?? acc.ketosis_impact,
      }
    },
    { fat_g: 0, protein_g: 0, carbs_g: 0, calories: 0, net_carbs_g: 0, ketosis_impact: 'neutral' as const }
  )

  // Fetch last 3 days of logs for ketosis status
  const threeDaysAgo = new Date(date)
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 2)
  const fromDate = threeDaysAgo.toISOString().slice(0, 10)

  const { data: recentLogs } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', fromDate)
    .lte('date', date)
    .order('date', { ascending: true })

  const ketosisStatus = calculateKetosisStatus((recentLogs ?? []) as FoodLogEntry[])

  // Fetch water for the day
  const { data: waterLogs } = await supabase
    .from('water_logs')
    .select('amount_ml')
    .eq('user_id', user.id)
    .eq('date', date)

  const water_ml = (waterLogs ?? []).reduce((sum, w) => sum + (w.amount_ml || 0), 0)

  const dailyMacros = {
    user_id: user.id,
    date,
    target: { fat_g: 120, protein_g: 80, carbs_g: 25, calories: 1800, net_carbs_g: 20, ketosis_impact: 'positive' },
    actual,
    water_ml,
    water_target_ml: 3000,
    ketosis_status: ketosisStatus,
  }

  return NextResponse.json(dailyMacros)
}
