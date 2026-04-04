'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

interface BudgetAllocation {
  total_income_kes: number
  allocations: Record<string, number>
  actual_spent: Record<string, number>
}

interface SavingsStreak {
  current_streak_days: number
  longest_streak_days: number
  total_saved_kes: number
}

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Rent',
  food_keto: 'Food/Keto',
  transport: 'Transport',
  savings: 'Savings',
  family_support: 'Family',
  tithe: 'Tithe',
  entertainment: 'Entertainment',
  buffer: 'Buffer',
}

const CATEGORY_COLORS: Record<string, string> = {
  rent: '#ef4444',
  food_keto: '#22c55e',
  transport: '#3b82f6',
  savings: '#f59e0b',
  family_support: '#a855f7',
  tithe: '#ec4899',
  entertainment: '#06b6d4',
  buffer: '#6b7280',
}

export default function FinancePage() {
  const [budget, setBudget] = useState<BudgetAllocation | null>(null)
  const [streak, setStreak] = useState<SavingsStreak | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/finance/budget').then((r) => r.json()),
      fetch('/api/finance/savings-streak').then((r) => r.json()),
    ]).then(([b, s]) => {
      setBudget(b)
      setStreak(s)
      setLoading(false)
    })
  }, [])

  const totalSpent = budget
    ? Object.values(budget.actual_spent).reduce((a, b) => a + b, 0)
    : 0

  const radialData = budget
    ? [
        {
          name: 'Spent',
          value: Math.min(totalSpent, budget.total_income_kes),
          fill: '#f59e0b',
        },
        {
          name: 'Income',
          value: budget.total_income_kes,
          fill: '#27272a',
        },
      ]
    : []

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Finance OS</h1>
      <p className="text-zinc-400 text-sm mb-6">
        {new Date().toLocaleString('en-KE', { month: 'long', year: 'numeric' })}
      </p>

      {loading ? (
        <p className="text-zinc-500 text-center mt-20">Loading…</p>
      ) : (
        <>
          {/* Budget Ring */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 mb-4">
            <h2 className="text-sm font-semibold text-zinc-400 mb-2">
              Monthly Budget
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="100%"
                    data={radialData}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar dataKey="value" background />
                    <Tooltip
                      formatter={(v: number) => `KES ${v.toLocaleString()}`}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  KES {totalSpent.toLocaleString()}
                </p>
                <p className="text-zinc-400 text-sm">
                  of KES {budget?.total_income_kes.toLocaleString()}
                </p>
                <p className="text-zinc-500 text-xs mt-1">
                  KES{' '}
                  {(
                    (budget?.total_income_kes ?? 0) - totalSpent
                  ).toLocaleString()}{' '}
                  remaining
                </p>
              </div>
            </div>
          </div>

          {/* Category Bars */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 mb-4">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">
              Categories
            </h2>
            <div className="space-y-3">
              {Object.entries(budget?.allocations ?? {}).map(([cat, alloc]) => {
                const spent = budget?.actual_spent[cat] ?? 0
                const pct = alloc > 0 ? Math.min((spent / alloc) * 100, 100) : 0
                const over = spent > alloc
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={over ? 'text-red-400' : 'text-zinc-300'}>
                        {CATEGORY_LABELS[cat] ?? cat}
                        {over && ' ⚠️'}
                      </span>
                      <span className="text-zinc-500">
                        {spent.toLocaleString()} / {alloc.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: over
                            ? '#ef4444'
                            : CATEGORY_COLORS[cat] ?? '#6b7280',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Savings Streak */}
          {streak && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 mb-4 flex items-center gap-4">
              <div className="text-4xl">🔥</div>
              <div>
                <p className="text-xl font-bold">
                  {streak.current_streak_days} day streak
                </p>
                <p className="text-zinc-400 text-xs">
                  Best: {streak.longest_streak_days} days · Total saved: KES{' '}
                  {streak.total_saved_kes.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/app/finance/approve"
              className="flex flex-col items-center justify-center bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-2xl py-4 transition-colors"
            >
              <span className="text-2xl mb-1">🛒</span>
              <span className="text-sm">Approve Purchase</span>
            </Link>
            <Link
              href="/app/finance/transactions"
              className="flex flex-col items-center justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-semibold rounded-2xl py-4 transition-colors"
            >
              <span className="text-2xl mb-1">📱</span>
              <span className="text-sm">Scan M-Pesa</span>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
