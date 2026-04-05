'use client'

import { useEffect, useState } from 'react'
import { QuickLogOverlay } from '@/components/QuickLogOverlay'

interface BibleVerse {
  reference: string
  text_en: string
}

interface DailyBriefing {
  greeting: string
  priorities: string[]
  alerts: string[]
  verse: BibleVerse
}

interface LifeScore {
  overall_score: number
  trend: 'up' | 'down' | 'stable'
}

// ── Widget types ─────────────────────────────────────────────────────────────

interface VerseData { reference: string; text_en: string }
interface MoodData { today_mood: number | null; today_stress: number | null }
interface KetoData { net_carbs_remaining_g: number; water_ml: number; water_target_ml: number; next_meal: string | null }
interface WaterData { water_ml: number; water_target_ml: number; percent: number }
interface FinanceData { month: string; balance_kes: number; total_spent_kes: number; savings_streak_days: number }
interface GoalData { primary_goal_title: string | null; progress_percent: number; habits_completed_today: number; habits_total: number }

const MOOD_EMOJI: Record<number, string> = { 1: '😢', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' }

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-zinc-800 rounded animate-pulse ${className}`} />
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-zinc-950 border border-zinc-900 rounded-2xl p-4 ${className}`}>
      {children}
    </div>
  )
}

// ── Life Score Ring ───────────────────────────────────────────────────────────
function LifeScoreRing({ score, trend }: { score: number; trend: string }) {
  const r = 44
  const circ = 276.46 // 2 * PI * 44, pre-computed to avoid hydration mismatch
  const offset = circ - (Math.min(100, Math.max(0, score)) / 100) * circ
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'
  const trendColor = trend === 'up' ? '#34d399' : trend === 'down' ? '#f87171' : '#71717a'

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#27272a" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={r} fill="none"
            stroke="#a78bfa" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${circ}`}
            strokeDashoffset={`${offset}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-white">{score}</span>
          <span className="text-xs font-bold" style={{ color: trendColor }}>{trendIcon}</span>
        </div>
      </div>
      <p className="text-xs text-zinc-500 mt-1">Life Score</p>
    </div>
  )
}

// ── Briefing Card ─────────────────────────────────────────────────────────────
function BriefingCard({ briefing }: { briefing: DailyBriefing }) {
  return (
    <Card>
      <h1 className="text-xl font-bold text-white mb-3 leading-tight">{briefing.greeting}</h1>
      {briefing.verse && (
        <div className="border-l-2 border-amber-500 pl-3 mb-3">
          <p className="text-xs font-semibold text-amber-400 mb-0.5">{briefing.verse.reference}</p>
          <p className="text-xs text-zinc-300 leading-relaxed">{briefing.verse.text_en}</p>
        </div>
      )}
      {briefing.priorities?.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Priorities</p>
          <ul className="space-y-1">
            {briefing.priorities.slice(0, 5).map((p, i) => (
              <li key={i} className="flex gap-2 text-xs text-zinc-200">
                <span className="text-violet-400 font-bold shrink-0">{i + 1}.</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {briefing.alerts?.length > 0 && (
        <div className="mt-3 space-y-1">
          {briefing.alerts.map((a, i) => (
            <div key={i} className="flex gap-2 bg-red-950/40 border border-red-900/40 rounded-xl px-3 py-2">
              <span className="text-red-400 text-xs">⚠</span>
              <p className="text-xs text-red-300">{a}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ── Widget: Verse ─────────────────────────────────────────────────────────────
function VerseWidget() {
  const [data, setData] = useState<VerseData | null>(null)
  useEffect(() => {
    fetch('/api/widgets/verse').then(r => r.json()).then(setData).catch(() => {})
  }, [])
  return (
    <Card>
      <p className="text-xs text-zinc-500 mb-1">✝️ Verse</p>
      {data ? (
        <>
          <p className="text-xs font-semibold text-amber-400 mb-1">{data.reference}</p>
          <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3">{data.text_en}</p>
        </>
      ) : (
        <><Skeleton className="h-3 w-1/2 mb-2" /><Skeleton className="h-3 w-full mb-1" /><Skeleton className="h-3 w-4/5" /></>
      )}
    </Card>
  )
}

// ── Widget: Mood ──────────────────────────────────────────────────────────────
function MoodWidget() {
  const [data, setData] = useState<MoodData | null>(null)
  useEffect(() => {
    fetch('/api/widgets/mood-checkin').then(r => r.json()).then(setData).catch(() => {})
  }, [])
  return (
    <Card>
      <p className="text-xs text-zinc-500 mb-2">😐 Mood</p>
      {data ? (
        data.today_mood ? (
          <>
            <p className="text-3xl mb-1">{MOOD_EMOJI[data.today_mood] ?? '😐'}</p>
            <p className="text-xs text-zinc-400">Stress: {data.today_stress}/5</p>
          </>
        ) : (
          <p className="text-xs text-zinc-400 italic">Not logged yet</p>
        )
      ) : (
        <><Skeleton className="h-8 w-8 mb-2" /><Skeleton className="h-3 w-1/2" /></>
      )}
    </Card>
  )
}

// ── Widget: Keto ──────────────────────────────────────────────────────────────
function KetoWidget() {
  const [data, setData] = useState<KetoData | null>(null)
  useEffect(() => {
    fetch('/api/widgets/keto-meal').then(r => r.json()).then(setData).catch(() => {})
  }, [])
  return (
    <Card>
      <p className="text-xs text-zinc-500 mb-1">🥑 Keto</p>
      {data ? (
        <>
          <p className="text-xs text-zinc-300 truncate mb-2">{data.next_meal ?? 'No meal plan'}</p>
          <div className="space-y-1.5">
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-0.5">
                <span>Carbs left</span><span className="text-green-400">{data.net_carbs_remaining_g}g</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full"><div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (data.net_carbs_remaining_g / 20) * 100)}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-0.5">
                <span>Water</span><span className="text-blue-400">{Math.round((data.water_ml / data.water_target_ml) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (data.water_ml / data.water_target_ml) * 100)}%` }} /></div>
            </div>
          </div>
        </>
      ) : (
        <><Skeleton className="h-3 w-3/4 mb-3" /><Skeleton className="h-2 w-full mb-2" /><Skeleton className="h-2 w-full" /></>
      )}
    </Card>
  )
}

// ── Widget: Water ─────────────────────────────────────────────────────────────
function WaterWidget() {
  const [data, setData] = useState<WaterData | null>(null)
  useEffect(() => {
    fetch('/api/widgets/water-tracker').then(r => r.json()).then(setData).catch(() => {})
  }, [])
  return (
    <Card>
      <div className="flex justify-between items-center mb-2">
        <p className="text-xs text-zinc-500">💧 Water</p>
        {data && <p className="text-xs font-semibold text-blue-400">{data.percent}%</p>}
      </div>
      {data ? (
        <>
          <div className="h-2 bg-zinc-800 rounded-full mb-2"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${data.percent}%` }} /></div>
          <p className="text-xs text-zinc-400"><span className="text-zinc-200">{data.water_ml}</span> / {data.water_target_ml} ml</p>
        </>
      ) : (
        <><Skeleton className="h-2 w-full mb-2" /><Skeleton className="h-3 w-1/2" /></>
      )}
    </Card>
  )
}

// ── Widget: Finance ───────────────────────────────────────────────────────────
function FinanceWidget() {
  const [data, setData] = useState<FinanceData | null>(null)
  useEffect(() => {
    fetch('/api/widgets/finance-balance').then(r => r.json()).then(setData).catch(() => {})
  }, [])
  return (
    <Card>
      <p className="text-xs text-zinc-500 mb-1">💰 Finance</p>
      {data ? (
        <>
          <p className={`text-base font-bold mb-1 ${data.balance_kes >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            KES {data.balance_kes.toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500">Spent KES {data.total_spent_kes.toLocaleString()}</p>
          {data.savings_streak_days > 0 && <p className="text-xs text-amber-400 mt-1">🔥 {data.savings_streak_days}d streak</p>}
        </>
      ) : (
        <><Skeleton className="h-5 w-2/3 mb-2" /><Skeleton className="h-3 w-1/2" /></>
      )}
    </Card>
  )
}

// ── Widget: Goals ─────────────────────────────────────────────────────────────
function GoalsWidget() {
  const [data, setData] = useState<GoalData | null>(null)
  useEffect(() => {
    fetch('/api/widgets/daily-goal').then(r => r.json()).then(setData).catch(() => {})
  }, [])
  return (
    <Card>
      <p className="text-xs text-zinc-500 mb-1">🎯 Goals</p>
      {data ? (
        <>
          <p className="text-xs font-medium text-zinc-100 truncate mb-2">{data.primary_goal_title ?? 'No goal set'}</p>
          <div className="h-1.5 bg-zinc-800 rounded-full mb-2"><div className="h-full bg-violet-500 rounded-full" style={{ width: `${data.progress_percent}%` }} /></div>
          <p className="text-xs text-zinc-400">Habits: <span className="text-zinc-200">{data.habits_completed_today}/{data.habits_total}</span></p>
        </>
      ) : (
        <><Skeleton className="h-3 w-3/4 mb-3" /><Skeleton className="h-2 w-full mb-2" /><Skeleton className="h-3 w-1/2" /></>
      )}
    </Card>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null)
  const [lifeScore, setLifeScore] = useState<LifeScore | null>(null)
  const [overlayOpen, setOverlayOpen] = useState(false)

  useEffect(() => {
    fetch('/api/ai/briefing').then(r => r.json()).then(setBriefing).catch(() => {})
    fetch('/api/gamification/life-score').then(r => r.json()).then(setLifeScore).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-28 space-y-4">

        {/* Header row: briefing + life score */}
        <div className="flex gap-3 items-start">
          <div className="flex-1 min-w-0">
            {briefing ? (
              <BriefingCard briefing={briefing} />
            ) : (
              <Card>
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-3 w-1/3 mb-2" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-5/6" />
              </Card>
            )}
          </div>
          <div className="shrink-0 pt-1">
            {lifeScore ? (
              <LifeScoreRing score={lifeScore.overall_score} trend={lifeScore.trend} />
            ) : (
              <div className="flex flex-col items-center">
                <Skeleton className="w-24 h-24 rounded-full" />
                <Skeleton className="h-3 w-16 mt-2" />
              </div>
            )}
          </div>
        </div>

        {/* 6 widgets */}
        <div className="grid grid-cols-2 gap-3">
          <VerseWidget />
          <MoodWidget />
          <KetoWidget />
          <WaterWidget />
          <FinanceWidget />
          <GoalsWidget />
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setOverlayOpen(true)}
        aria-label="Quick log"
        className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all shadow-lg flex items-center justify-center text-2xl font-light"
      >
        +
      </button>

      <QuickLogOverlay open={overlayOpen} onClose={() => setOverlayOpen(false)} />
    </div>
  )
}
