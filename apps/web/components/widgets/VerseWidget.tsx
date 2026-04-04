'use client'

import { useEffect, useState } from 'react'

interface BibleVerseWidgetData {
  reference: string
  text_en: string
  text_sw: string
  date: string
}

export function VerseWidget() {
  const [data, setData] = useState<BibleVerseWidgetData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/widgets/verse')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 animate-pulse">
        <div className="h-3 bg-zinc-800 rounded w-1/3 mb-2" />
        <div className="h-3 bg-zinc-800 rounded w-full mb-1" />
        <div className="h-3 bg-zinc-800 rounded w-4/5" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
      <p className="text-xs font-semibold text-amber-400 mb-1">{data.reference}</p>
      <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3">{data.text_en}</p>
    </div>
  )
}
