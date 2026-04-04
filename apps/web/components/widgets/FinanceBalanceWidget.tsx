'use client'

import { useEffect, useState } from 'react'

interface FinanceBalanceWidgetData {
  month: string
  total_income_kes: number
  total_spent_kes: number
  balance_kes: number
  savings_streak_days: number
}

function formatKES(amount: number) {
  return `KES ${amount.toLocaleString('en-KE')}`
}

export function FinanceBalanceWidget() {
  const [data, setData] = useState<FinanceBalanceWidgetData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/widgets/finance-balance')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 animate-pulse">
        <div className="h-3 bg-zinc-800 rounded w-1/3 mb-3" />
        <div className="h-5 bg-zinc-800 rounded w-2/3 mb-2" />
        <div className="h-3 bg-zinc-800 rounded w-1/2" />
      </div>
    )
  }

  if (!data) return null

  const isPositive = data.balance_kes >= 0

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
      <p className="text-xs text-zinc-500 mb-1">{data.month} balance</p>
      <p className={`text-lg font-bold mb-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {formatKES(data.balance_kes)}
      </p>
      <p className="text-xs text-zinc-500">
        Spent {formatKES(data.total_spent_kes)}
      </p>
      {data.savings_streak_days > 0 && (
        <p className="text-xs text-amber-400 mt-1">
          🔥 {data.savings_streak_days}d savings streak
        </p>
      )}
    </div>
  )
}
