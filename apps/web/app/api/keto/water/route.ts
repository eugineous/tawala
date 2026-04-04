import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const body = await req.json()
  const { amount_ml } = body as { amount_ml: number }

  if (!amount_ml || amount_ml <= 0) {
    return NextResponse.json({ error: 'amount_ml must be > 0' }, { status: 400 })
  }

  const today = new Date().toISOString().slice(0, 10)

  const { data: log, error } = await supabase
    .from('water_logs')
    .insert({ user_id: user.id, date: today, amount_ml })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update daily_macros.water_ml for today
  const { data: existing } = await supabase
    .from('daily_macros')
    .select('water_ml')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  if (existing) {
    await supabase
      .from('daily_macros')
      .update({ water_ml: (existing.water_ml || 0) + amount_ml })
      .eq('user_id', user.id)
      .eq('date', today)
  } else {
    await supabase.from('daily_macros').insert({
      user_id: user.id,
      date: today,
      target: { fat_g: 120, protein_g: 80, carbs_g: 25, calories: 1800, net_carbs_g: 20, ketosis_impact: 'positive' },
      actual: { fat_g: 0, protein_g: 0, carbs_g: 0, calories: 0, net_carbs_g: 0, ketosis_impact: 'neutral' },
      water_ml: amount_ml,
      water_target_ml: 3000,
      ketosis_status: { level: 'borderline', estimated_score: 50, days_in_ketosis: 0, cheat_risk_score: 30 },
    })
  }

  return NextResponse.json(log)
}

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: logs, error } = await supabase
    .from('water_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .order('logged_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const total_ml = (logs ?? []).reduce((sum, l) => sum + (l.amount_ml || 0), 0)

  return NextResponse.json({ total_ml, target_ml: 3000, logs: logs ?? [] })
}
