import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { allocateBudget } from '@tawala/core'

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()

  // Get user profile for monthly income
  const { data: profile } = await supabase
    .from('profiles')
    .select('monthly_income_kes')
    .eq('id', user.id)
    .single()

  const income = profile?.monthly_income_kes ?? 45000
  const allocations = allocateBudget(income)

  // Current month YYYY-MM
  const month = new Date().toISOString().slice(0, 7)

  // Sum actual_spent by category for current month
  const { data: txRows } = await supabase
    .from('transactions')
    .select('category, amount_kes')
    .eq('user_id', user.id)
    .gte('date', `${month}-01`)
    .lt('date', `${month}-32`)

  const actual_spent: Record<string, number> = {}
  for (const tx of txRows ?? []) {
    actual_spent[tx.category] = (actual_spent[tx.category] ?? 0) + tx.amount_kes
  }

  const budgetAllocation = {
    user_id: user.id,
    month,
    total_income_kes: income,
    allocations: {
      rent: allocations.rent,
      food_keto: allocations.food_keto,
      transport: allocations.transport,
      savings: allocations.savings,
      family_support: allocations.family_support,
      tithe: allocations.tithe,
      entertainment: allocations.entertainment,
      buffer: allocations.buffer,
    },
    actual_spent,
  }

  // Upsert to budget_allocations
  await supabase
    .from('budget_allocations')
    .upsert({ ...budgetAllocation }, { onConflict: 'user_id,month' })

  return NextResponse.json(budgetAllocation)
}
