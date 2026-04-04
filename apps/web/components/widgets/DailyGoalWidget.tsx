'use client'

import { useEffect, useState } from 'react'

interface DailyGoalWidgetData {
  primary_goal_title: string | null
  progress_percent: number
  habits_completed_today: number
  habits_total: number
}

export function DailyGoalWidget() {
  const [data, setData] = useState<DailyGoalWidgetData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/widgets/daily-goal')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 animate-pulse">
        <div className="h-3 bg-zinc-800 rounded w-3/4 mb-3" />
        <div className="h-2 bg-zinc-800 rounded w-full mb-2" />
        <div className="h-3 bg-zinc-800 rounded w-1/2" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
      <p className="text-xs text-zinc-500 mb-1">Primary goal</p>
      <p className="text-sm font-medium text-zinc-100 truncate mb-2">
        {data.primary_goal_title ?? 'No goal set'}
      </p>

      <div className="mb-2">
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>Progress</span>
          <span className="text-violet-400">{data.progress_percent}%</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all"
            style={{ width: `${data.progress_percent}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-zinc-400">
        Habits:{' '}
        <span className="text-zinc-200">
          {data.habits_completed_today}/{data.habits_total}
        </span>
      </p>
    </div>
  )
}
