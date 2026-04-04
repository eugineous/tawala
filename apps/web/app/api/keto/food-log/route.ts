import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const body = await req.json()
  const { meal_type, food_items, date } = body as {
    meal_type: string
    food_items: Array<{ name: string; quantity_g: number }>
    date?: string
  }

  if (!meal_type || !food_items?.length) {
    return NextResponse.json({ error: 'meal_type and food_items required' }, { status: 400 })
  }

  const logDate = date ?? new Date().toISOString().slice(0, 10)

  // Call Gemini to calculate macros
  let macros = {
    fat_g: 0,
    protein_g: 0,
    carbs_g: 0,
    calories: 0,
    net_carbs_g: 0,
    ketosis_impact: 'neutral' as 'positive' | 'neutral' | 'negative',
  }
  let enrichedItems = food_items.map((fi) => ({ ...fi, macros: { fat_g: 0, protein_g: 0, carbs_g: 0, calories: 0, net_carbs_g: 0 } }))

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent(
      `Calculate macros for these food items. Return JSON: { items: [{ name, quantity_g, fat_g, protein_g, carbs_g, calories, net_carbs_g }], totals: { fat_g, protein_g, carbs_g, calories, net_carbs_g } }\n\nFood items: ${JSON.stringify(food_items)}`
    )
    const text = result.response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const t = parsed.totals ?? {}
      macros.fat_g = Number(t.fat_g) || 0
      macros.protein_g = Number(t.protein_g) || 0
      macros.carbs_g = Number(t.carbs_g) || 0
      macros.calories = Number(t.calories) || 0
      macros.net_carbs_g = Math.min(Number(t.net_carbs_g) || macros.carbs_g, macros.carbs_g)
      enrichedItems = (parsed.items ?? food_items).map((item: Record<string, unknown>) => ({
        name: item.name,
        quantity_g: item.quantity_g,
        macros: {
          fat_g: Number(item.fat_g) || 0,
          protein_g: Number(item.protein_g) || 0,
          carbs_g: Number(item.carbs_g) || 0,
          calories: Number(item.calories) || 0,
          net_carbs_g: Math.min(Number(item.net_carbs_g) || Number(item.carbs_g) || 0, Number(item.carbs_g) || 0),
        },
      }))
    }
  } catch (err) {
    console.error('Gemini macro error:', err)
  }

  if (macros.net_carbs_g < 10) macros.ketosis_impact = 'positive'
  else if (macros.net_carbs_g > 25) macros.ketosis_impact = 'negative'
  else macros.ketosis_impact = 'neutral'

  const { data: entry, error } = await supabase
    .from('food_logs')
    .insert({
      user_id: user.id,
      date: logDate,
      meal_type,
      food_items: enrichedItems,
      total_macros: macros,
      logged_via: 'manual',
      photo_url: null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Upsert daily_macros
  const { data: existing } = await supabase
    .from('daily_macros')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', logDate)
    .single()

  if (existing) {
    const prev = existing.actual ?? {}
    await supabase
      .from('daily_macros')
      .update({
        actual: {
          fat_g: (prev.fat_g || 0) + macros.fat_g,
          protein_g: (prev.protein_g || 0) + macros.protein_g,
          carbs_g: (prev.carbs_g || 0) + macros.carbs_g,
          calories: (prev.calories || 0) + macros.calories,
          net_carbs_g: (prev.net_carbs_g || 0) + macros.net_carbs_g,
          ketosis_impact: macros.ketosis_impact,
        },
      })
      .eq('user_id', user.id)
      .eq('date', logDate)
  } else {
    await supabase.from('daily_macros').insert({
      user_id: user.id,
      date: logDate,
      target: { fat_g: 120, protein_g: 80, carbs_g: 25, calories: 1800, net_carbs_g: 20, ketosis_impact: 'positive' },
      actual: { ...macros },
      water_ml: 0,
      water_target_ml: 3000,
      ketosis_status: { level: 'borderline', estimated_score: 50, days_in_ketosis: 0, cheat_risk_score: 30 },
    })
  }

  return NextResponse.json(entry)
}

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const date = req.nextUrl.searchParams.get('date') ?? new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
