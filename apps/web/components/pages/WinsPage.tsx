'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'

interface WinEntry {
  id: string
  description: string
  date: string
  created_at: string
}

export default function WinsPage() {
  const [wins, setWins] = useState<WinEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/mental/wins')
      .then((r) => r.json())
      .then((d) => {
        setWins(d.entries ?? [])
        setLoading(false)
      })
  }, [])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!description.trim()) {
      setError('Please describe your win.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/mental/wins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: description.trim() }),
    })
    setSaving(false)
    if (res.ok) {
      const newWin = await res.json()
      setWins([newWin, ...wins])
      setDescription('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Failed to save win')
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/mental" className="text-zinc-400 hover:text-white text-lg">←</Link>
        <div>
          <h1 className="text-2xl font-bold">Wins Log</h1>
          <p className="text-zinc-400 text-sm">Celebrate every victory</p>
        </div>
      </div>

      {/* Add Win Form */}
      <form onSubmit={handleAdd} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 mb-6">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Log a Win 🏆</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you accomplish today?"
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600"
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
          >
            {saved ? '✓' : saving ? '…' : 'Add'}
          </button>
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </form>

      {/* Wins List */}
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Recent Wins</p>
      {loading ? (
        <p className="text-zinc-600 text-sm text-center py-8">Loading…</p>
      ) : wins.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🌱</p>
          <p className="text-zinc-500 text-sm">No wins logged yet.</p>
          <p className="text-zinc-600 text-xs mt-1">Every step forward counts — log your first win!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {wins.map((win, i) => (
            <div
              key={win.id}
              className="bg-zinc-950 border border-zinc-900 rounded-2xl px-4 py-3 flex items-start gap-3"
            >
              <span className="text-lg mt-0.5">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white leading-snug">{win.description}</p>
                <p className="text-xs text-zinc-600 mt-1">{formatDate(win.date)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
