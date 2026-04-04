'use client'

import { useEffect, useState, useRef } from 'react'

interface GratitudeEntry {
  id: string
  content: string
  date: string
  created_at: string
}

function getWeekRange(): { start: string; end: string } {
  const now = new Date()
  const day = now.getDay() // 0=Sun
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  }
}

export default function GratitudePage() {
  const [entries, setEntries] = useState<GratitudeEntry[]>([])
  const [weekCount, setWeekCount] = useState(0)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const loadEntries = async () => {
    const res = await fetch('/api/spirit/gratitude')
    const data = await res.json()
    setEntries(data.entries ?? [])

    const { start, end } = getWeekRange()
    const weekRes = await fetch(`/api/spirit/gratitude?start=${start}&end=${end}`)
    const weekData = await weekRes.json()
    setWeekCount((weekData.entries ?? []).length)
    setLoading(false)
  }

  useEffect(() => {
    loadEntries()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    try {
      await fetch('/api/spirit/gratitude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      setContent('')
      await loadEntries()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Gratitude Journal</h1>
      <p className="text-zinc-400 text-sm mb-6">
        {weekCount} entr{weekCount !== 1 ? 'ies' : 'y'} this week
      </p>

      {/* Add Entry Form */}
      <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 mb-6">
        <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">🙌 What are you grateful for today?</p>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="I am grateful for…"
          rows={3}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-amber-600 transition-colors"
        />
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="mt-3 w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
        >
          {submitting ? 'Saving…' : 'Add Entry'}
        </button>
      </form>

      {/* Entries List */}
      {loading ? (
        <p className="text-zinc-500 text-center mt-10">Loading…</p>
      ) : entries.length === 0 ? (
        <div className="text-center mt-10">
          <span className="text-4xl">🌱</span>
          <p className="text-zinc-500 text-sm mt-3">No entries yet. Start your gratitude practice!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-amber-400 font-semibold">
                  {new Date(entry.date).toLocaleDateString('en-KE', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="text-xs text-zinc-600">
                  {new Date(entry.created_at).toLocaleTimeString('en-KE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed">{entry.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
