'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface MacroBreakdown {
  fat_g: number
  protein_g: number
  carbs_g: number
  calories: number
  net_carbs_g: number
}

interface Meal {
  type: string
  name: string
  macros: MacroBreakdown
}

interface MealPlanDay {
  day: string
  meals: Meal[]
}

interface ShoppingItem {
  name: string
  quantity: string
  estimated_cost_kes: number
  market: string
}

interface MealPlan {
  week: string
  budget_kes: number
  days: MealPlanDay[]
  shopping_list: ShoppingItem[]
}

const MARKET_COLORS: Record<string, string> = {
  Gikomba: '#f59e0b',
  Wakulima: '#22c55e',
  Supermarket: '#3b82f6',
  Local: '#a855f7',
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
}

export default function MealPlanPage() {
  const router = useRouter()
  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeDay, setActiveDay] = useState(0)

  useEffect(() => {
    fetch('/api/keto/meal-plan')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setPlan(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load meal plan')
        setLoading(false)
      })
  }, [])

  const totalCost = plan?.shopping_list.reduce((sum, item) => sum + item.estimated_cost_kes, 0) ?? 0
  const budgetPct = plan ? Math.min((totalCost / plan.budget_kes) * 100, 100) : 0

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white text-xl">‹</button>
        <div>
          <h1 className="text-xl font-bold">Weekly Meal Plan</h1>
          <p className="text-xs text-zinc-500">Kenya Keto · KES 5,000/month budget</p>
        </div>
      </div>

      {loading && <p className="text-zinc-500 text-center mt-20">Generating your meal plan…</p>}
      {error && <p className="text-red-400 text-center mt-20">{error}</p>}

      {plan && (
        <>
          {/* Budget Overview */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-semibold text-zinc-400">Weekly Budget</h2>
              <span className={`text-sm font-bold ${totalCost > plan.budget_kes ? 'text-red-400' : 'text-green-400'}`}>
                KES {totalCost.toLocaleString()} / {plan.budget_kes.toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${budgetPct}%`,
                  backgroundColor: totalCost > plan.budget_kes ? '#ef4444' : '#22c55e',
                }}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {totalCost <= plan.budget_kes
                ? `KES ${(plan.budget_kes - totalCost).toLocaleString()} under budget`
                : `KES ${(totalCost - plan.budget_kes).toLocaleString()} over budget`}
            </p>
          </div>

          {/* Day Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {plan.days.map((day, idx) => (
              <button
                key={idx}
                onClick={() => setActiveDay(idx)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeDay === idx
                    ? 'bg-green-600 text-white'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                }`}
              >
                {day.day.slice(0, 3)}
              </button>
            ))}
          </div>

          {/* Day Meals */}
          {plan.days[activeDay] && (
            <div className="space-y-3 mb-6">
              <h2 className="text-sm font-semibold text-zinc-300">{plan.days[activeDay].day}</h2>
              {plan.days[activeDay].meals.map((meal, idx) => (
                <div key={idx} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{MEAL_ICONS[meal.type] ?? '🍽️'}</span>
                    <div className="flex-1">
                      <p className="text-xs text-zinc-500 capitalize">{meal.type}</p>
                      <p className="font-semibold text-sm text-white">{meal.name}</p>
                      <div className="flex gap-3 mt-1 text-xs text-zinc-500">
                        <span className="text-amber-400">{Math.round(meal.macros.fat_g)}g fat</span>
                        <span className="text-blue-400">{Math.round(meal.macros.protein_g)}g protein</span>
                        <span className="text-red-400">{Math.round(meal.macros.net_carbs_g)}g net carbs</span>
                        <span>{Math.round(meal.macros.calories)} kcal</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Shopping List */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">🛒 Shopping List</h2>
            <div className="space-y-2">
              {plan.shopping_list.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-zinc-900 last:border-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: MARKET_COLORS[item.market] ?? '#6b7280' }}
                    />
                    <div>
                      <p className="text-sm text-white">{item.name}</p>
                      <p className="text-xs text-zinc-500">{item.quantity} · {item.market}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-green-400">
                    KES {item.estimated_cost_kes.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-between">
              <span className="text-sm text-zinc-400">Total</span>
              <span className={`text-sm font-bold ${totalCost > plan.budget_kes ? 'text-red-400' : 'text-green-400'}`}>
                KES {totalCost.toLocaleString()}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
