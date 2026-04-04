'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Goal {
  id: string
  title: string
  description: string
  month: string
  is_primary: boolean
  status: string
  progress_percent: number
}

interface Habit {
  id: string
  name: string
  current_streak: number
  longest_streak: number
  is_morning_routine: boolean
  module: string
}

interface HabitLog {
  habit_id: string
  completed: boolean
  date: string
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [todayLogs, setTodayLogs] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [loggingHabit, setLoggingHabit] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const month = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    Promise.all([
      fetch(`/api/goals?month=${month}`).then((r) => r.json()),
      fetch('/api/habits').then((r) => r.json()),
    ]).then(([goalsData, habitsData]) => {
      setGoals(goalsData.goals ?? [])
      const habitList: Habit[] = habitsData.habits ?? []
      setHabits(habitList)

      // Fetch today's logs for each habit
      if (habitList.length > 0) {
        Promise.all(
          habitList.map((h) =>
            fetch(`/api/habits/${h.id}/log?date=${today}`)
              .then((r) => r.json())
              .catch(() => null)
          )
        ).then((logs) => {
          const logMap: Record<string, boolean> = {}
          logs.forEach((log, i) => {
            if (log?.log) logMap[habitList[i].id] = log.log.completed
          })
          setTodayLogs(logMap)
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })
  }, [month, today])

  const toggleHabit = async (habitId: string, currentValue: boolean) => {
    setLoggingHabit(habitId)
    try {
      const res = await fetch(`/api/habits/${habitId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentValue, date: today }),
      })
      const data = await res.json()
      if (data.log) {
        setTodayLogs((prev) => ({ ...prev, [habitId]: data.log.completed }))
        // Update streak in habits list
        setHabits((prev) =>
          prev.map((h) =>
            h.id === habitId ? { ...h, current_streak: data.streak } : h
          )
        )
      }
    } finally {
      setLoggingHabit(null)
    }
  }

  const primaryGoal = goals.find((g) => g.is_primary)
  const otherGoals = goals.filter((g) => !g.is_primary)
  const completedToday = Object.values(todayLogs).filter(Boolean).length
  const totalHabits = habits.length

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">Goals OS</h1>
        <Link
          href="/app/goals/decision"
          className="text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full px-3 py-1.5 transition-colors"
        >
          🤔 Evaluate Decision
        </Link>
      </div>
      <p className="text-zinc-400 text-sm mb-6">
        {new Date().toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {loading ? (
        <p className="text-zinc-500 text-center mt-20">Loading…</p>
      ) : (
        <>
          {/* Primary Monthly Goal Card */}
          {primaryGoal ? (
            <div className="bg-zinc-950 border border-emerald-900/50 rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  🎯 Monthly Goal #{month}
                </span>
                <span className="text-xs text-zinc-500">{primaryGoal.progress_percent}%</span>
              </div>
              <h2 className="text-lg font-bold text-white mb-1">{primaryGoal.title}</h2>
              {primaryGoal.description && (
                <p className="text-sm text-zinc-400 mb-3">{primaryGoal.description}</p>
              )}
              {/* Progress bar */}
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${primaryGoal.progress_percent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 mb-4 text-center">
              <p className="text-zinc-500 text-sm">No primary goal set for {month}</p>
            </div>
          )}

          {/* Other Goals */}
          {otherGoals.length > 0 && (
            <div className="mb-4 space-y-2">
              {otherGoals.map((goal) => (
                <div key={goal.id} className="bg-zinc-950 border border-zinc-900 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-zinc-200">{goal.title}</span>
                    <span className="text-xs text-zinc-500">{goal.progress_percent}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${goal.progress_percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Habit Checklist */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-zinc-300">📋 Today's Habits</span>
              <span className="text-xs text-zinc-500">
                {completedToday}/{totalHabits} done
              </span>
            </div>

            {habits.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-2">No habits yet</p>
            ) : (
              <ul className="space-y-2">
                {habits.map((habit) => {
                  const done = todayLogs[habit.id] ?? false
                  const isLogging = loggingHabit === habit.id
                  return (
                    <li key={habit.id} className="flex items-center gap-3">
                      <button
                        onClick={() => toggleHabit(habit.id, done)}
                        disabled={isLogging}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          done
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-zinc-600 hover:border-emerald-500'
                        }`}
                        aria-label={done ? `Unmark ${habit.name}` : `Complete ${habit.name}`}
                      >
                        {done && <span className="text-xs text-white">✓</span>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-sm ${done ? 'line-through text-zinc-500' : 'text-zinc-200'}`}
                        >
                          {habit.name}
                        </span>
                        {habit.is_morning_routine && (
                          <span className="ml-2 text-xs text-amber-500">☀️</span>
                        )}
                      </div>
                      {/* Streak badge */}
                      {habit.current_streak > 0 && (
                        <span className="text-xs bg-orange-900/40 text-orange-400 border border-orange-800/40 rounded-full px-2 py-0.5 flex-shrink-0">
                          🔥 {habit.current_streak}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Streak Badges */}
          {habits.filter((h) => h.current_streak >= 3).length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">🏅 Active Streaks</p>
              <div className="flex flex-wrap gap-2">
                {habits
                  .filter((h) => h.current_streak >= 3)
                  .sort((a, b) => b.current_streak - a.current_streak)
                  .map((habit) => (
                    <div
                      key={habit.id}
                      className="bg-zinc-900 border border-orange-800/40 rounded-xl px-3 py-2 text-center"
                    >
                      <p className="text-lg font-bold text-orange-400">🔥 {habit.current_streak}</p>
                      <p className="text-xs text-zinc-400 mt-0.5 max-w-[80px] truncate">{habit.name}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Quick action */}
          <Link
            href="/app/goals/decision"
            className="flex items-center justify-center gap-2 w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-2xl py-4 transition-colors"
          >
            <span className="text-xl">🤔</span>
            <div>
              <p className="text-sm font-semibold">AI Decision Evaluator</p>
              <p className="text-xs text-zinc-500">Get Gemini to evaluate a decision</p>
            </div>
          </Link>
        </>
      )}
    </div>
  )
}
