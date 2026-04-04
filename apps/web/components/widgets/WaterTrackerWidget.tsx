'use client'

import { useEffect, useState } from 'react'

interface WaterTrackerWidgetData {
  water_ml: number
  water_target_ml: number
  percent: number
}

export function WaterTrackerWidget() {
  const [data, setData] = useState<WaterTrackerWidgetData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/widgets/water-tracker')
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
        <div className="h-3 bg-zinc-800 rounded w-1/3" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
      <div className="flex justify-between items-center mb-2">
        <p className="text-xs text-zinc-500">Water intake</p>
        <p className="text-xs font-semibold text-blue-400">{data.percent}%</p>
      </div>

      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${data.percent}%` }}
        />
      </div>

      <p className="text-xs text-zinc-400">
        <span className="text-zinc-200">{data.water_ml}</span>
        <span className="text-zinc-600"> / {data.water_target_ml} ml</span>
      </p>
    </div>
  )
}
