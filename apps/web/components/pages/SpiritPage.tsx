'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CrossIcon, BookIcon, HeartIcon, FireIcon } from '@/components/icons'

interface BibleVerse {
  id: string
  reference: string
  text_en: string
  text_sw: string
  theme: string
  date: string
}

interface SpiritScore {
  verse_streak: number
  prayer_streak: number
  memory_reviews: number
  gratitude_entries: number
  score: number
}

export default function SpiritPage() {
  const [verse, setVerse] = useState<BibleVerse | null>(null)
  const [prayer, setPrayer] = useState<string | null>(null)
  const [score, setScore] = useState<SpiritScore | null>(null)
  const [showSwahili, setShowSwahili] = useState(false)
  const [prayerExpanded, setPrayerExpanded] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/spirit/verse').then((r) => r.json()),
      fetch('/api/spirit/prayer').then((r) => r.json()),
      fetch('/api/spirit/score').then((r) => r.json()),
    ]).then(([v, p, s]) => {
      setVerse(v.verse ?? null)
      setPrayer(p.prayer ?? null)
      setScore(s.score !== undefined ? s : null)
      setLoading(false)
    })
  }, [])

  const spiritScore = score?.score ?? 0
  const scoreColor = spiritScore >= 70 ? '#22c55e' : spiritScore >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Spirit</h1>
      <p className="text-zinc-500 text-sm mb-6">
        {new Date().toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {loading ? (
        <p className="text-zinc-500 text-center mt-20">Loading…</p>
      ) : (
        <>
          {/* Daily Verse Card */}
          <div
            className="bg-[#0a0a0a] border border-amber-900/30 rounded-2xl p-5 mb-4 cursor-pointer"
            onClick={() => setShowSwahili((s) => !s)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CrossIcon className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Verse of the Day</span>
              </div>
              <span className="text-xs text-zinc-500">{showSwahili ? 'SW' : 'EN'} · tap to toggle</span>
            </div>
            {verse ? (
              <>
                <p className="text-sm leading-relaxed text-zinc-100 mb-3">
                  {showSwahili ? verse.text_sw : verse.text_en}
                </p>
                <p className="text-xs font-semibold text-amber-400">{verse.reference}</p>
                <p className="text-xs text-zinc-600 mt-1 capitalize">Theme: {verse.theme}</p>
              </>
            ) : (
              <p className="text-zinc-500 text-sm">No verse available</p>
            )}
          </div>

          {/* Morning Prayer */}
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-4 mb-4">
            <button
              className="w-full flex items-center justify-between"
              onClick={() => setPrayerExpanded((e) => !e)}
            >
              <div className="flex items-center gap-2">
                <CrossIcon className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-semibold text-zinc-300">Morning Prayer</span>
              </div>
              <span className="text-zinc-500 text-lg leading-none">{prayerExpanded ? '−' : '+'}</span>
            </button>
            {prayerExpanded && prayer && (
              <p className="mt-3 text-sm text-zinc-300 leading-relaxed whitespace-pre-line">{prayer}</p>
            )}
            {prayerExpanded && !prayer && (
              <p className="mt-3 text-sm text-zinc-500">Prayer not available</p>
            )}
          </div>

          {/* Streak Counters */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <FireIcon className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-amber-400">{score?.verse_streak ?? 0}</p>
              <p className="text-xs text-zinc-500 mt-1">Verse Streak</p>
            </div>
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <FireIcon className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-blue-400">{score?.prayer_streak ?? 0}</p>
              <p className="text-xs text-zinc-500 mt-1">Prayer Streak</p>
            </div>
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <BookIcon className="w-3.5 h-3.5 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-green-400">{score?.memory_reviews ?? 0}</p>
              <p className="text-xs text-zinc-500 mt-1">Reviews</p>
            </div>
          </div>

          {/* Spirit Score */}
          <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Weekly Spirit Score</p>
                <p className="text-3xl font-bold text-white">
                  {spiritScore}<span className="text-lg text-zinc-500">/100</span>
                </p>
              </div>
              <div
                className="w-16 h-16 rounded-full border-4 flex items-center justify-center"
                style={{ borderColor: scoreColor }}
              >
                <span className="text-lg font-bold" style={{ color: scoreColor }}>{spiritScore}</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/app/spirit/memory"
              className="flex flex-col items-center justify-center bg-[#0a0a0a] hover:bg-[#111111] border border-[#1f1f1f] rounded-2xl py-5 transition-colors"
            >
              <BookIcon className="w-6 h-6 text-amber-400 mb-2" />
              <span className="text-sm font-semibold">Memory Verses</span>
              <span className="text-xs text-zinc-500 mt-0.5">Spaced repetition</span>
            </Link>
            <Link
              href="/app/spirit/gratitude"
              className="flex flex-col items-center justify-center bg-[#0a0a0a] hover:bg-[#111111] border border-[#1f1f1f] rounded-2xl py-5 transition-colors"
            >
              <HeartIcon className="w-6 h-6 text-pink-400 mb-2" />
              <span className="text-sm font-semibold">Gratitude Journal</span>
              <span className="text-xs text-zinc-500 mt-0.5">{score?.gratitude_entries ?? 0} this week</span>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
