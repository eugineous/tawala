'use client'

import { useEffect, useState } from 'react'

interface KetoMealWidgetData {
  next_meal: string | null
  net_carbs_remaining_g: number
  water_ml: number
  water_target_ml: number
}

export function KetoMealWidget() {
  const [data, setData] = useState<KetoMealWidgetData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/widgets/keto-meal')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 animate-pulse">
        <div className="h-3 bg-zinc-800 rounded w-1/2 mb-3" />
        <div className="h-2 bg-zinc-800 rounded w-full mb-2" />
        <div className="h-2 bg-zinc-800 rounded w-3/4" />
      </div>
    )
  }

  if (!data) return null

  const waterPercent = Math.min(100, Math.round((data.water_ml / data.water_target_ml) * 100))

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
      <p className="text-xs text-zinc-500 mb-1">Next meal</p>
      <p className="text-sm font-medium text-zinc-100 truncate mb-3">
        {data.next_meal ?? '—'}
      </p>

      <div className="mb-2">
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>Net carbs left</span>
          <span className="text-green-400">{data.net_carbs_remaining_g}g</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${Math.min(100, (data.net_carbs_remaining_g / 20) * 100)}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>Water</span>
          <span className="text-blue-400">{waterPercent}%</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${waterPercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
