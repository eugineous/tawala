'use client'

import { useEffect, useRef, useState } from 'react'
import type { Habit } from '@tawala/core'

// ── helpers ──────────────────────────────────────────────────────────────────

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

async function awardXP(action: string, module: string, xp_value: number) {
  await fetch('/api/gamification/xp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, module, xp_value }),
  })
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed bottom-36 left-1/2 -translate-x-1/2 z-[60] bg-zinc-800 border border-zinc-700 text-white text-sm px-4 py-2.5 rounded-xl shadow-xl animate-fade-in">
      {message}
    </div>
  )
}

// ── Habit Selector ────────────────────────────────────────────────────────────

function HabitSelector({
  onSelect,
  onCancel,
}: {
  onSelect: (habit: Habit) => void
  onCancel: () => void
}) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/habits')
      .then((r) => r.json())
      .then((data) => setHabits(Array.isArray(data) ? data : data.habits ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-zinc-300">Select a habit</p>
        <button onClick={onCancel} className="text-xs text-zinc-500 hover:text-zinc-300">
          Cancel
        </button>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <p className="text-xs text-zinc-500 italic">No habits found. Create one in Goals.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {habits.map((h) => (
            <button
              key={h.id}
              onClick={() => onSelect(h)}
              className="w-full text-left px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm text-zinc-200 transition-colors"
            >
              {h.name}
              {h.current_streak > 0 && (
                <span className="ml-2 text-xs text-amber-400">🔥 {h.current_streak}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Overlay ──────────────────────────────────────────────────────────────

interface QuickLogOverlayProps {
  open: boolean
  onClose: () => void
}

type Step = 'menu' | 'habit-select'

export function QuickLogOverlay({ open, onClose }: QuickLogOverlayProps) {
  const [step, setStep] = useState<Step>('menu')
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setStep('menu')
      setBusy(null)
    }
  }, [open])

  function showToast(msg: string) {
    setToast(msg)
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleLogMood() {
    setBusy('mood')
    try {
      await fetch('/api/mental/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: 3, stress: 2, time_of_day: getTimeOfDay() }),
      })
      await awardXP('log_mood', 'mental_health', 5)
      showToast('Mood logged ✓')
      onClose()
    } catch {
      showToast('Failed to log mood')
    } finally {
      setBusy(null)
    }
  }

  async function handleLogWater() {
    setBusy('water')
    try {
      await fetch('/api/keto/water', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_ml: 250 }),
      })
      await awardXP('log_food', 'keto', 8)
      showToast('+250ml water logged ✓')
      onClose()
    } catch {
      showToast('Failed to log water')
    } finally {
      setBusy(null)
    }
  }

  async function handleHabitSelected(habit: Habit) {
    setBusy('habit')
    try {
      await fetch(`/api/habits/${habit.id}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      })
      await awardXP('complete_habit', 'goals', 10)
      showToast(`"${habit.name}" completed ✓`)
      onClose()
    } catch {
      showToast('Failed to log habit')
    } finally {
      setBusy(null)
    }
  }

  async function handleFoodPhoto(file: File) {
    setBusy('food')
    try {
      const form = new FormData()
      form.append('photo', file)
      await fetch('/api/keto/log-food-photo', { method: 'POST', body: form })
      await awardXP('log_food', 'keto', 8)
      showToast('Food photo logged ✓')
      onClose()
    } catch {
      showToast('Failed to log food photo')
    } finally {
      setBusy(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/80"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick log"
        className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 rounded-t-3xl border-t border-zinc-900 px-5 pt-4 pb-10 max-w-lg mx-auto"
      >
        {/* Handle + header */}
        <div className="flex items-center justify-between mb-5">
          <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
          <p className="text-base font-semibold text-white">Quick Log</p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {step === 'menu' && (
          <div className="grid grid-cols-2 gap-3">
            {/* Log Mood */}
            <ActionButton
              emoji="😐"
              label="Log Mood"
              loading={busy === 'mood'}
              onClick={handleLogMood}
            />

            {/* Log Water */}
            <ActionButton
              emoji="💧"
              label="Log Water (+250ml)"
              loading={busy === 'water'}
              onClick={handleLogWater}
            />

            {/* Complete Habit */}
            <ActionButton
              emoji="✅"
              label="Complete Habit"
              loading={busy === 'habit'}
              onClick={() => setStep('habit-select')}
            />

            {/* Log Food Photo */}
            <ActionButton
              emoji="📸"
              label="Log Food Photo"
              loading={busy === 'food'}
              onClick={() => fileRef.current?.click()}
            />
          </div>
        )}

        {step === 'habit-select' && (
          <HabitSelector
            onSelect={handleHabitSelected}
            onCancel={() => setStep('menu')}
          />
        )}

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFoodPhoto(file)
            e.target.value = ''
          }}
        />
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  )
}

// ── Action Button ─────────────────────────────────────────────────────────────

function ActionButton({
  emoji,
  label,
  loading,
  onClick,
}: {
  emoji: string
  label: string
  loading: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex flex-col items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 active:scale-95 disabled:opacity-50 rounded-2xl px-3 py-5 transition-all"
    >
      <span className="text-3xl">{loading ? '⏳' : emoji}</span>
      <span className="text-xs text-zinc-300 text-center leading-tight">{label}</span>
    </button>
  )
}
