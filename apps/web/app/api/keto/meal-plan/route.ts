import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { GoogleGenerativeAI } from '@google/generative-ai'

function getCurrentWeek(): string {
  const now = new Date()
  const year = now.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1
  const week = Math.ceil(dayOfYear / 7)
  return `${year}-${String(week).padStart(2, '0')}`
}

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const week = req.nextUrl.searchParams.get('week') ?? getCurrentWeek()
  const cacheKey = `meal-plan-${week}`

  // Check cache
  const { data: cached } = await supabase
    .from('ai_cache')
    .select('response, expires_at')
    .eq('user_id', user.id)
    .eq('cache_key', cacheKey)
    .single()

  if (cached && new Date(cached.expires_at) > new Date()) {
    return NextResponse.json(cached.response)
  }

  // Generate with Gemini
  let mealPlan = null
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent(
      `Generate a 7-day keto meal plan for a Kenyan professional with a KES 5,000/month food budget. Use local foods: eggs, avocado, sukuma wiki, nyama choma, cauliflower, spinach, fish. Each day should have breakfast, lunch, dinner. Keep net carbs under 25g/day. Include a shopping list with estimated prices from Nairobi markets (Gikomba, Wakulima, Supermarket). Return JSON matching this schema exactly:
{
  "week": "${week}",
  "budget_kes": 5000,
  "days": [
    {
      "day": "Monday",
      "meals": [
        { "type": "breakfast", "name": "...", "macros": { "fat_g": 0, "protein_g": 0, "carbs_g": 0, "calories": 0, "net_carbs_g": 0, "ketosis_impact": "positive" } },
        { "type": "lunch", "name": "...", "macros": { "fat_g": 0, "protein_g": 0, "carbs_g": 0, "calories": 0, "net_carbs_g": 0, "ketosis_impact": "positive" } },
        { "type": "dinner", "name": "...", "macros": { "fat_g": 0, "protein_g": 0, "carbs_g": 0, "calories": 0, "net_carbs_g": 0, "ketosis_impact": "positive" } }
      ]
    }
  ],
  "shopping_list": [
    { "name": "...", "quantity": "...", "estimated_cost_kes": 100, "market": "Gikomba" }
  ]
}`
    )
    const text = result.response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      mealPlan = JSON.parse(jsonMatch[0])
      // Ensure shopping list items have estimated_cost_kes > 0
      if (mealPlan.shopping_list) {
        mealPlan.shopping_list = mealPlan.shopping_list.map((item: Record<string, unknown>) => ({
          ...item,
          estimated_cost_kes: Math.max(1, Number(item.estimated_cost_kes) || 50),
        }))
      }
      mealPlan.user_id = user.id
    }
  } catch (err) {
    console.error('Gemini meal plan error:', err)
    return NextResponse.json({ error: 'Failed to generate meal plan' }, { status: 500 })
  }

  if (!mealPlan) {
    return NextResponse.json({ error: 'Failed to generate meal plan' }, { status: 500 })
  }

  // Cache for 7 days
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await supabase.from('ai_cache').upsert(
    {
      user_id: user.id,
      cache_key: cacheKey,
      response: mealPlan,
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: 'user_id,cache_key' }
  )

  return NextResponse.json(mealPlan)
}
