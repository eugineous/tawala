'use client'

import { useEffect, useState } from 'react'

interface BibleVerse {
  id: string
  reference: string
  text_en: string
  text_sw: string
  theme: string
  date: string
}

interface MemoryVerse {
  id: string
  verse_id: string
  verse: BibleVerse
  ease_factor: number
  interval_days: number
  next_review: string
  repetitions: number
  last_reviewed: string | null
}

interface AllVerse {
  id: string
  reference: string
  text_en: string
  theme: string
}

const QUALITY_LABELS = ['Forgot', 'Hard', 'Okay', 'Good', 'Easy', 'Perfect']
const QUALITY_COLORS = [
  'bg-red-700 hover:bg-red-600',
  'bg-orange-700 hover:bg-orange-600',
  'bg-yellow-700 hover:bg-yellow-600',
  'bg-lime-700 hover:bg-lime-600',
  'bg-green-700 hover:bg-green-600',
  'bg-emerald-600 hover:bg-emerald-500',
]

export default function MemoryPage() {
  const [verses, setVerses] = useState<MemoryVerse[]>([])
  const [allVerses, setAllVerses] = useState<AllVerse[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [reviewed, setReviewed] = useState<Record<string, string>>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/spirit/memory-verses')
      .then((r) => r.json())
      .then((d) => {
        setVerses(d.verses ?? [])
        setLoading(false)
      })
  }, [])

  const loadAllVerses = async () => {
    // Fetch all bible verses for the add modal
    const res = await fetch('/api/spirit/verse')
    const data = await res.json()
    // We only have today's verse from this endpoint; for a full list we'd need a separate endpoint
    // Use what we have
    if (data.verse) setAllVerses([data.verse])
    setShowAddModal(true)
  }

  const handleRate = async (quality: number) => {
    const verse = verses[currentIdx]
    if (!verse) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/spirit/memory-verses/${verse.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quality }),
      })
      const updated = await res.json()
      setReviewed((r) => ({ ...r, [verse.id]: updated.next_review }))
      setFlipped(false)
      setTimeout(() => setCurrentIdx((i) => i + 1), 300)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddVerse = async (verseId: string) => {
    await fetch('/api/spirit/memory-verses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verse_id: verseId }),
    })
    setShowAddModal(false)
    // Refresh
    const res = await fetch('/api/spirit/memory-verses')
    const data = await res.json()
    setVerses(data.verses ?? [])
    setCurrentIdx(0)
  }

  const current = verses[currentIdx]
  const done = currentIdx >= verses.length

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Memory Verses</h1>
          <p className="text-zinc-400 text-sm">{verses.length} due for review</p>
        </div>
        <button
          onClick={loadAllVerses}
          className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          + Add Verse
        </button>
      </div>

      {loading ? (
        <p className="text-zinc-500 text-center mt-20">Loading…</p>
      ) : done ? (
        <div className="flex flex-col items-center justify-center mt-20 text-center">
          <span className="text-5xl mb-4">🎉</span>
          <p className="text-xl font-bold mb-2">All done for today!</p>
          <p className="text-zinc-400 text-sm">You reviewed {Object.keys(reviewed).length} verse{Object.keys(reviewed).length !== 1 ? 's' : ''}.</p>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="flex gap-1 mb-6">
            {verses.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${i < currentIdx ? 'bg-amber-400' : i === currentIdx ? 'bg-amber-600' : 'bg-zinc-800'}`}
              />
            ))}
          </div>

          {/* Flashcard */}
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 mb-6 min-h-48 flex flex-col items-center justify-center cursor-pointer text-center"
            onClick={() => setFlipped((f) => !f)}
          >
            {!flipped ? (
              <>
                <p className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">Reference</p>
                <p className="text-2xl font-bold text-amber-400">{current?.verse?.reference}</p>
                <p className="text-xs text-zinc-600 mt-4">Tap to reveal verse</p>
              </>
            ) : (
              <>
                <p className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">Verse</p>
                <p className="text-sm leading-relaxed text-zinc-100">{current?.verse?.text_en}</p>
                <p className="text-xs text-zinc-500 mt-3 italic">{current?.verse?.text_sw}</p>
              </>
            )}
          </div>

          {/* Rating Buttons */}
          {flipped && (
            <div>
              <p className="text-xs text-zinc-500 text-center mb-3">How well did you remember?</p>
              <div className="grid grid-cols-3 gap-2">
                {QUALITY_LABELS.map((label, q) => (
                  <button
                    key={q}
                    disabled={submitting}
                    onClick={() => handleRate(q)}
                    className={`${QUALITY_COLORS[q]} text-white text-sm font-semibold py-3 rounded-xl transition-colors disabled:opacity-50`}
                  >
                    <span className="block text-xs text-white/70">{q}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Next review info */}
          {reviewed[current?.id] && (
            <p className="text-xs text-zinc-500 text-center mt-4">
              Next review: {reviewed[current?.id]}
            </p>
          )}
        </>
      )}

      {/* Add Verse Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={() => setShowAddModal(false)}>
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-t-2xl w-full p-6 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">Add Verse to Memory</h2>
            {allVerses.length === 0 ? (
              <p className="text-zinc-500 text-sm">No verses available to add.</p>
            ) : (
              <div className="space-y-3">
                {allVerses.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleAddVerse(v.id)}
                    className="w-full text-left bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-4 transition-colors"
                  >
                    <p className="font-semibold text-amber-400 text-sm">{v.reference}</p>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{v.text_en}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
