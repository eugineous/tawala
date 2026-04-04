'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const MOOD_EMOJI: Record<number, string> = { 1: '😢', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' }
const BURNOUT_COLOR: Record<string, string> = {
  low: '#22c55e',
  moderate: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
}

interface MoodEntry {
  mood: number
  stress: number
  time_of_day: string
  date: string
}

interface SleepEntry {
  duration_hours: number
  date: string
}

interface BurnoutData {
  score: number
  level: string
  factors: string[]
}

export default function MentalPage() {
  const [todayMood, setTodayMood] = useState<MoodEntry | null>(null)
  const [lastSleep, setLastSleep] = useState<SleepEntry | null>(null)
  const [burnout, setBurnout] = useState<BurnoutData | null>(null)
  const [loading, setLoading] = useState(true)

  // Quick mood log state
  const [logMood, setLogMood] = useState(3)
  const [logStress, setLogStress] = useState(2)
  const [logTimeOfDay, setLogTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('morning')
  const [logNote, setLogNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setLogTimeOfDay('morning')
    else if (hour < 17) setLogTimeOfDay('afternoon')
    else setLogTimeOfDay('evening')

    Promise.all([
      fetch(`/api/mental/mood?start_date=${today}&end_date=${today}`).then((r) => r.json()),
      fetch(`/api/mental/sleep?start_date=${today}&end_date=${today}`).then((r) => r.json()),
      fetch('/api/mental/burnout').then((r) => r.json()),
    ]).then(([moodData, sleepData, burnoutData]) => {
      const entries: MoodEntry[] = moodData.entries ?? []
      setTodayMood(entries[0] ?? null)
      const sleepEntries: SleepEntry[] = sleepData.entries ?? []
      setLastSleep(sleepEntries[0] ?? null)
      if (burnoutData.score !== undefined) setBurnout(burnoutData)
      setLoading(false)
    })
  }, [today])

  async function handleLogMood() {
    setSaving(true)
    await fetch('/api/mental/mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood: logMood, stress: logStress, time_of_day: logTimeOfDay, note: logNote || undefined }),
    })
    setSaving(false)
    setSaved(true)
    setTodayMood({ mood: logMood, stress: logStress, time_of_day: logTimeOfDay, date: today })
    setTimeout(() => setSaved(false), 2000)
  }

  const sleepHours = lastSleep?.duration_hours ?? 0
  const sleepPct = Math.min(100, (sleepHours / 8) * 100)
  const burnoutColor = BURNOUT_COLOR[burnout?.level ?? 'low']

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Mental Health OS</h1>
      <p className="text-zinc-400 text-sm mb-6">
        {new Date().toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {loading ? (
        <p className="text-zinc-500 text-center mt-20">Loading…</p>
      ) : (
        <>
          {/* Mood Ring */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 mb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Today's Mood</p>
            {todayMood ? (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-4 border-violet-500 flex items-center justify-center text-3xl">
                  {MOOD_EMOJI[todayMood.mood]}
                </div>
                <div>
                  <p className="text-lg font-bold">Mood {todayMood.mood}/5</p>
                  <p className="text-sm text-zinc-400">Stress {todayMood.stress}/5 · {todayMood.time_of_day}</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-zinc-400 text-sm mb-3">Log your mood for today</p>
                <div className="flex gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      onClick={() => setLogMood(v)}
                      className={`text-2xl transition-transform ${logMood === v ? 'scale-125' : 'opacity-50'}`}
                    >
                      {MOOD_EMOJI[v]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mb-1">Stress level: {logStress}/5</p>
                <input
                  type="range" min={1} max={5} value={logStress}
                  onChange={(e) => setLogStress(Number(e.target.value))}
                  className="w-full accent-violet-500 mb-3"
                />
                <div className="flex gap-2 mb-3">
                  {(['morning', 'afternoon', 'evening'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setLogTimeOfDay(t)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        logTimeOfDay === t
                          ? 'bg-violet-600 border-violet-500 text-white'
                          : 'border-zinc-700 text-zinc-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Optional note…"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 mb-3"
                />
                <button
                  onClick={handleLogMood}
                  disabled={saving}
                  className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-colors"
                >
                  {saved ? '✓ Saved' : saving ? 'Saving…' : 'Log Mood'}
                </button>
              </div>
            )}
          </div>

          {/* Sleep Bar */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Last Night's Sleep</p>
              <p className="text-sm font-bold text-blue-400">
                {sleepHours > 0 ? `${sleepHours.toFixed(1)}h` : '—'} / 8h
              </p>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all"
                style={{
                  width: `${sleepPct}%`,
                  backgroundColor: sleepPct >= 87.5 ? '#22c55e' : sleepPct >= 62.5 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            {!lastSleep && (
              <p className="text-xs text-zinc-600 mt-2">No sleep logged yet — <Link href="/app/mental" className="text-blue-400 underline">log sleep</Link></p>
            )}
          </div>

          {/* Burnout Gauge */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Burnout Risk</p>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full uppercase"
                style={{ backgroundColor: burnoutColor + '33', color: burnoutColor }}
              >
                {burnout?.level ?? 'low'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full border-4 flex items-center justify-center text-lg font-bold"
                style={{ borderColor: burnoutColor }}
              >
                {burnout?.score ?? 0}
              </div>
              <div className="flex-1">
                <div className="w-full bg-zinc-800 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${burnout?.score ?? 0}%`, backgroundColor: burnoutColor }}
                  />
                </div>
                {burnout?.factors && burnout.factors.length > 0 && (
                  <p className="text-xs text-zinc-500 mt-2">{burnout.factors[0]}</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/app/mental/cbt"
              className="flex flex-col items-center justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-2xl py-5 transition-colors"
            >
              <span className="text-2xl mb-1">🧠</span>
              <span className="text-sm font-semibold">CBT Journal</span>
              <span className="text-xs text-zinc-500 mt-0.5">Thought reframing</span>
            </Link>
            <Link
              href="/app/mental/wins"
              className="flex flex-col items-center justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-2xl py-5 transition-colors"
            >
              <span className="text-2xl mb-1">🏆</span>
              <span className="text-sm font-semibold">Wins Log</span>
              <span className="text-xs text-zinc-500 mt-0.5">Celebrate progress</span>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
