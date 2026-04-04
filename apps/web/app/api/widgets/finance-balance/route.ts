import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface FinanceBalanceWidgetData {
  month: string
  total_income_kes: number
  total_spent_kes: number
  balance_kes: number
  savings_streak_days: number
}

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const month = new Date().toISOString().slice(0, 7) // YYYY-MM
  const monthStart = `${month}-01`
  const monthEnd = `${month}-31`

  // Income transactions this month
  const { data: incomeTxs } = await supabase
    .from('transactions')
    .select('amount_kes')
    .eq('user_id', user.id)
    .eq('type', 'income')
    .gte('date', monthStart)
    .lte('date', monthEnd)

  const total_income_kes = (incomeTxs ?? []).reduce((sum, t) => sum + (t.amount_kes ?? 0), 0)

  // Expense transactions this month
  const { data: expenseTxs } = await supabase
    .from('transactions')
    .select('amount_kes')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .gte('date', monthStart)
    .lte('date', monthEnd)

  const total_spent_kes = (expenseTxs ?? []).reduce((sum, t) => sum + (t.amount_kes ?? 0), 0)

  // Savings streak
  const { data: streak } = await supabase
    .from('savings_streaks')
    .select('current_streak_days')
    .eq('user_id', user.id)
    .maybeSingle()

  const widget: FinanceBalanceWidgetData = {
    month,
    total_income_kes,
    total_spent_kes,
    balance_kes: total_income_kes - total_spent_kes,
    savings_streak_days: streak?.current_streak_days ?? 0,
  }

  return NextResponse.json(widget)
}
