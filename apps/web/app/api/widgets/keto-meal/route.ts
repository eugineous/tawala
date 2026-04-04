import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface KetoMealWidgetData {
  next_meal: string | null
  net_carbs_remaining_g: number
  water_ml: number
  water_target_ml: number
}

const DAILY_NET_CARB_TARGET = 20

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]

  // Today's net carbs consumed
  const { data: foodLogs } = await supabase
    .from('food_logs')
    .select('total_macros')
    .eq('user_id', user.id)
    .eq('date', today)

  const netCarbsConsumed = (foodLogs ?? []).reduce(
    (sum, log) => sum + ((log.total_macros as { net_carbs_g?: number })?.net_carbs_g ?? 0),
    0
  )
  const net_carbs_remaining_g = Math.max(0, DAILY_NET_CARB_TARGET - netCarbsConsumed)

  // Today's water intake
  const { data: waterLogs } = await supabase
    .from('water_logs')
    .select('amount_ml')
    .eq('user_id', user.id)
    .eq('date', today)

  const water_ml = (waterLogs ?? []).reduce((sum, l) => sum + (l.amount_ml ?? 0), 0)

  // Next meal from today's meal plan (first meal not yet logged)
  const currentHour = new Date().getHours()
  const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack']
  const MEAL_HOURS: Record<string, number> = { breakfast: 8, lunch: 13, dinner: 19, snack: 16 }

  const { data: mealPlan } = await supabase
    .from('meal_plans')
    .select('days')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let next_meal: string | null = null

  if (mealPlan?.days) {
    const days = mealPlan.days as Array<{ day: string; meals: Array<{ type: string; name: string }> }>
    const todayPlan = days.find((d) => d.day === today)
    if (todayPlan?.meals) {
      const upcoming = todayPlan.meals
        .filter((m) => (MEAL_HOURS[m.type] ?? 12) >= currentHour)
        .sort((a, b) => (MEAL_HOURS[a.type] ?? 12) - (MEAL_HOURS[b.type] ?? 12))
      next_meal = upcoming[0]?.name ?? null
    }
    if (!next_meal) {
      // Fall back to next meal type by time of day
      const nextType = MEAL_ORDER.find((t) => (MEAL_HOURS[t] ?? 12) >= currentHour)
      if (nextType) {
        const allMeals = days.flatMap((d) => d.meals)
        const found = allMeals.find((m) => m.type === nextType)
        next_meal = found?.name ?? null
      }
    }
  }

  const widget: KetoMealWidgetData = {
    next_meal,
    net_carbs_remaining_g: Math.round(net_carbs_remaining_g * 10) / 10,
    water_ml,
    water_target_ml: 3000,
  }

  return NextResponse.json(widget)
}
