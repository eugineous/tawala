import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()

  const formData = await req.formData()
  const imageFile = formData.get('image') as File | null
  const meal_type = (formData.get('meal_type') as string) || 'snack'

  if (!imageFile) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }

  const arrayBuffer = await imageFile.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const base64 = buffer.toString('base64')
  const mimeType = imageFile.type || 'image/jpeg'
  const imageBase64DataUrl = `data:${mimeType};base64,${base64}`

  // Upload to Supabase Storage
  const fileName = `${user.id}/${Date.now()}-${imageFile.name}`
  let photoUrl: string | null = null
  const { data: uploadData } = await supabase.storage
    .from('food-photos')
    .upload(fileName, buffer, { contentType: mimeType, upsert: false })

  if (uploadData) {
    const { data: urlData } = await supabase.storage
      .from('food-photos')
      .createSignedUrl(fileName, 3600)
    photoUrl = urlData?.signedUrl ?? null
  }

  // Call NVIDIA NIM vision API to identify food items
  let foodItems: Array<{ name: string; quantity_g: number }> = []
  try {
    const nvResponse = await fetch(
      'https://ai.api.nvidia.com/v1/gr/meta-llama/llama-3.2-11b-vision-instruct/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta/llama-3.2-11b-vision-instruct',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Identify all food items in this image. For each item, estimate the portion size in grams. Return JSON array: [{ name, quantity_g }]',
                },
                { type: 'image_url', image_url: { url: imageBase64DataUrl } },
              ],
            },
          ],
          max_tokens: 1024,
        }),
      }
    )

    if (nvResponse.ok) {
      const nvData = await nvResponse.json()
      const content = nvData.choices?.[0]?.message?.content ?? ''
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        foodItems = JSON.parse(jsonMatch[0])
      }
    }
  } catch (err) {
    console.error('NVIDIA NIM error:', err)
  }

  if (!foodItems.length) {
    return NextResponse.json({
      items: [],
      confidence: 0,
      message: 'No food detected. Try a closer photo.',
    })
  }

  // Call Gemini to calculate macros
  let macros = {
    fat_g: 0,
    protein_g: 0,
    carbs_g: 0,
    calories: 0,
    net_carbs_g: 0,
    ketosis_impact: 'neutral' as 'positive' | 'neutral' | 'negative',
  }
  let enrichedItems: Array<{ name: string; quantity_g: number; macros: Omit<typeof macros, 'ketosis_impact'> }> = []

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent(
      `Calculate macros for these food items. For each item return fat_g, protein_g, carbs_g, calories, net_carbs_g. Also return totals. Return JSON: { items: [{ name, quantity_g, fat_g, protein_g, carbs_g, calories, net_carbs_g }], totals: { fat_g, protein_g, carbs_g, calories, net_carbs_g } }\n\nFood items: ${JSON.stringify(foodItems)}`
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
      // Ensure net_carbs_g <= carbs_g
      macros.net_carbs_g = Math.min(Number(t.net_carbs_g) || macros.carbs_g, macros.carbs_g)
      enrichedItems = (parsed.items ?? foodItems).map((item: Record<string, unknown>) => ({
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

  // Determine ketosis_impact
  if (macros.net_carbs_g < 10) {
    macros.ketosis_impact = 'positive'
  } else if (macros.net_carbs_g > 25) {
    macros.ketosis_impact = 'negative'
  } else {
    macros.ketosis_impact = 'neutral'
  }

  const today = new Date().toISOString().slice(0, 10)

  // Insert food log entry
  await supabase.from('food_logs').insert({
    user_id: user.id,
    date: today,
    meal_type,
    food_items: enrichedItems,
    total_macros: macros,
    logged_via: 'photo',
    photo_url: photoUrl,
  })

  // Upsert daily_macros
  const { data: existing } = await supabase
    .from('daily_macros')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
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
      .eq('date', today)
  } else {
    await supabase.from('daily_macros').insert({
      user_id: user.id,
      date: today,
      target: { fat_g: 120, protein_g: 80, carbs_g: 25, calories: 1800, net_carbs_g: 20, ketosis_impact: 'positive' },
      actual: { ...macros },
      water_ml: 0,
      water_target_ml: 3000,
      ketosis_status: { level: 'borderline', estimated_score: 50, days_in_ketosis: 0, cheat_risk_score: 30 },
    })
  }

  return NextResponse.json({ ...macros, items: enrichedItems })
}
