'use client'

import { useEffect, useState } from 'react'
import type { DailyBriefing, LifeScore } from '@tawala/core'
import {
  VerseWidget,
  KetoMealWidget,
  FinanceBalanceWidget,
  DailyGoalWidget,
  MoodCheckinWidget,
  WaterTrackerWidget,
} from '@/components/widgets'
import { QuickLogOverlay } from '@/components/QuickLogOverlay'

// ── Life Score Ring ──────────────────────────────────────────────────────────

function LifeScoreRing({ score, trend }: { score: number; trend: 'up' | 'down' | 'stable' }) {
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'
  const trendColor =
    trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-400'

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth="8"
          />
          {/* Progress */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#a78bfa"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{Math.round(score)}</span>
          <span className={`text-sm font-semibold ${trendColor}`}>{trendIcon}</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-zinc-500">Life Score</p>
    </div>
  )
}

// ── Daily Briefing Card ──────────────────────────────────────────────────────

function BriefingCard({ briefing }: { briefing: DailyBriefing }) {
  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4">
      {/* Greeting */}
      <h1 className="text-2xl font-bold text-white leading-tight">{briefing.greeting}</h1>

      {/* Verse */}
      <div className="border-l-2 border-amber-500 pl-3">
        <p className="text-xs font-semibold text-amber-400 mb-0.5">{briefing.verse.reference}</p>
        <p className="text-xs text-zinc-300 leading-relaxed">{briefing.verse.text_en}</p>
      </div>

      {/* Priorities */}
      {briefing.priorities.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Today's Priorities
          </p>
          <ul className="space-y-1.5">
            {briefing.priorities.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-200">
                <span className="mt-0.5 text-violet-400 font-bold text-xs">{i + 1}.</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Alerts */}
      {briefing.alerts.length > 0 && (
        <div className="space-y-1.5">
          {briefing.alerts.map((alert, i) => (
            <div
              key={i}
              className="flex items-start gap-2 bg-red-950/40 border border-red-900/50 rounded-xl px-3 py-2"
            >
              <span className="text-red-400 text-xs mt-0.5">⚠</span>
              <p className="text-xs text-red-300">{alert}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Skeleton loaders ─────────────────────────────────────────────────────────

function BriefingSkeleton() {
  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-3 animate-pulse">
      <div className="h-7 bg-zinc-800 rounded w-3/4" />
      <div className="h-3 bg-zinc-800 rounded w-1/3" />
      <div className="h-3 bg-zinc-800 rounded w-full" />
      <div className="h-3 bg-zinc-800 rounded w-5/6" />
    </div>
  )
}

function ScoreSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center animate-pulse">
      <div className="w-28 h-28 rounded-full bg-zinc-900" />
      <div className="mt-1 h-3 w-16 bg-zinc-800 rounded" />
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AppHomePage() {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null)
  const [lifeScore, setLifeScore] = useState<LifeScore | null>(null)
  const [overlayOpen, setOverlayOpen] = useState(false)

  useEffect(() => {
    fetch('/api/ai/briefing')
      .then((r) => r.json())
      .then(setBriefing)
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/gamification/life-score')
      .then((r) => r.json())
      .then(setLifeScore)
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-8 space-y-5">
        {/* Top row: briefing + life score ring */}
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            {briefing ? <BriefingCard briefing={briefing} /> : <BriefingSkeleton />}
          </div>
          <div className="shrink-0 pt-1">
            {lifeScore ? (
              <LifeScoreRing score={lifeScore.overall_score} trend={lifeScore.trend} />
            ) : (
              <ScoreSkeleton />
            )}
          </div>
        </div>

        {/* 6 widgets in 2-column grid */}
        <div className="grid grid-cols-2 gap-3">
          <VerseWidget />
          <MoodCheckinWidget />
          <KetoMealWidget />
          <WaterTrackerWidget />
          <FinanceBalanceWidget />
          <DailyGoalWidget />
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setOverlayOpen(true)}
        aria-label="Quick log"
        className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all shadow-lg shadow-violet-900/50 flex items-center justify-center text-2xl"
      >
        +
      </button>

      {/* Quick-log overlay */}
      <QuickLogOverlay open={overlayOpen} onClose={() => setOverlayOpen(false)} />
    </div>
  )
}
