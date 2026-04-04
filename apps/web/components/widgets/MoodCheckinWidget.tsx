'use client'

import { useEffect, useState } from 'react'

interface MoodCheckinWidgetData {
  today_mood: number | null
  today_stress: number | null
  last_logged: string | null
}

const MOOD_EMOJI: Record<number, string> = {
  1: '😢',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😄',
}

export function MoodCheckinWidget() {
  const [data, setData] = useState<MoodCheckinWidgetData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/widgets/mood-checkin')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 animate-pulse">
        <div className="h-3 bg-zinc-800 rounded w-1/2 mb-3" />
        <div className="h-8 bg-zinc-800 rounded w-1/3" />
      </div>
    )
  }

  if (!data) return null

  const hasMood = data.today_mood !== null

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
      <p className="text-xs text-zinc-500 mb-2">Today's mood</p>
      {hasMood ? (
        <>
          <p className="text-3xl mb-1">{MOOD_EMOJI[data.today_mood!]}</p>
          {data.today_stress !== null && (
            <p className="text-xs text-zinc-400">
              Stress: <span className="text-zinc-200">{data.today_stress}/5</span>
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-zinc-400 italic">Log your mood →</p>
      )}
    </div>
  )
}
