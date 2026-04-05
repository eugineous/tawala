'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'

interface CBTEntry {
  id: string
  situation: string
  automatic_thought: string
  emotion: string
  cognitive_distortion: string | null
  rational_response: string | null
  date: string
}

export default function CBTPage() {
  const [entries, setEntries] = useState<CBTEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [situation, setSituation] = useState('')
  const [automaticThought, setAutomaticThought] = useState('')
  const [emotion, setEmotion] = useState('')
  const [distortion, setDistortion] = useState('')
  const [rationalResponse, setRationalResponse] = useState('')

  useEffect(() => {
    fetch('/api/mental/cbt')
      .then((r) => r.json())
      .then((d) => {
        setEntries(d.entries ?? [])
        setLoading(false)
      })
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!situation.trim() || !automaticThought.trim() || !emotion.trim()) {
      setError('Situation, automatic thought, and emotion are required.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/mental/cbt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        situation: situation.trim(),
        automatic_thought: automaticThought.trim(),
        emotion: emotion.trim(),
        cognitive_distortion: distortion.trim() || undefined,
        rational_response: rationalResponse.trim() || undefined,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const newEntry = await res.json()
      setEntries([newEntry, ...entries])
      setSituation('')
      setAutomaticThought('')
      setEmotion('')
      setDistortion('')
      setRationalResponse('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Failed to save entry')
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/mental" className="text-zinc-400 hover:text-white text-lg">←</Link>
        <div>
          <h1 className="text-2xl font-bold">CBT Journal</h1>
          <p className="text-zinc-400 text-sm">Reframe your thoughts</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 mb-6">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4">New Entry</p>

        <label className="block mb-3">
          <span className="text-xs text-zinc-400 mb-1 block">Situation *</span>
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="What happened? Describe the situation…"
            rows={2}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 resize-none"
          />
        </label>

        <label className="block mb-3">
          <span className="text-xs text-zinc-400 mb-1 block">Automatic Thought *</span>
          <textarea
            value={automaticThought}
            onChange={(e) => setAutomaticThought(e.target.value)}
            placeholder="What thought popped into your head?"
            rows={2}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 resize-none"
          />
        </label>

        <label className="block mb-3">
          <span className="text-xs text-zinc-400 mb-1 block">Emotion *</span>
          <input
            type="text"
            value={emotion}
            onChange={(e) => setEmotion(e.target.value)}
            placeholder="e.g. anxious, frustrated, sad"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600"
          />
        </label>

        <label className="block mb-3">
          <span className="text-xs text-zinc-400 mb-1 block">Cognitive Distortion <span className="text-zinc-600">(optional)</span></span>
          <input
            type="text"
            value={distortion}
            onChange={(e) => setDistortion(e.target.value)}
            placeholder="e.g. catastrophising, all-or-nothing thinking"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600"
          />
        </label>

        <label className="block mb-4">
          <span className="text-xs text-zinc-400 mb-1 block">Rational Response <span className="text-zinc-600">(optional)</span></span>
          <textarea
            value={rationalResponse}
            onChange={(e) => setRationalResponse(e.target.value)}
            placeholder="What's a more balanced way to see this?"
            rows={2}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 resize-none"
          />
        </label>

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Entry'}
        </button>
      </form>

      {/* Entries List */}
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Recent Entries</p>
      {loading ? (
        <p className="text-zinc-600 text-sm text-center py-8">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-zinc-600 text-sm text-center py-8">No entries yet. Start journaling above.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-violet-400 uppercase">{entry.emotion}</span>
                <span className="text-xs text-zinc-600">{entry.date}</span>
              </div>
              <p className="text-sm text-zinc-300 mb-1">
                <span className="text-zinc-500">Situation: </span>{entry.situation}
              </p>
              <p className="text-sm text-zinc-300 mb-1">
                <span className="text-zinc-500">Thought: </span>{entry.automatic_thought}
              </p>
              {entry.cognitive_distortion && (
                <p className="text-xs text-amber-400 mt-1">⚠ {entry.cognitive_distortion}</p>
              )}
              {entry.rational_response && (
                <p className="text-sm text-green-400 mt-2">
                  <span className="text-zinc-500 text-xs">Reframe: </span>{entry.rational_response}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
