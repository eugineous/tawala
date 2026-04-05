'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface MacroBreakdown {
  fat_g: number; protein_g: number; carbs_g: number
  calories: number; net_carbs_g: number
}

interface KetosisStatus {
  level: 'deep' | 'light' | 'borderline' | 'out'
  estimated_score: number; days_in_ketosis: number; cheat_risk_score: number
}

interface DailyMacros {
  target: MacroBreakdown; actual: MacroBreakdown
  water_ml: number; water_target_ml: number; ketosis_status: KetosisStatus
}

const KETOSIS_COLORS: Record<string, string> = {
  deep: '#22c55e', light: '#84cc16', borderline: '#f59e0b', out: '#ef4444',
}
const KETOSIS_LABELS: Record<string, string> = {
  deep: 'Deep Ketosis 🔥', light: 'Light Ketosis ✅', borderline: 'Borderline ⚠️', out: 'Out of Ketosis ❌',
}

function MacroBar({ label, actual, target, color }: { label: string; actual: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color }}>{label}</span>
        <span className="text-zinc-400">{Math.round(actual)}g / {target}g</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function KetoPage() {
  const [macros, setMacros] = useState<DailyMacros | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/keto/macros').then(r => r.json()).then(setMacros).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const level = macros?.ketosis_status?.level ?? 'out'
  const color = KETOSIS_COLORS[level]
  const waterPct = macros ? Math.min((macros.water_ml / macros.water_target_ml) * 100, 100) : 0

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Keto OS</h1>
      <p className="text-zinc-400 text-sm mb-6">
        {new Date().toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {loading ? (
        <div className="space-y-3"><div className="h-20 bg-zinc-900 rounded-2xl animate-pulse" /><div className="h-40 bg-zinc-900 rounded-2xl animate-pulse" /></div>
      ) : (
        <>
          {/* Ketosis Badge */}
          <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ backgroundColor: `${color}22`, border: `1px solid ${color}44` }}>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <div>
              <p className="font-semibold" style={{ color }}>{KETOSIS_LABELS[level]}</p>
              <p className="text-zinc-400 text-xs">Score: {macros?.ketosis_status.estimated_score ?? 0}/100 · {macros?.ketosis_status.days_in_ketosis ?? 0} days</p>
            </div>
          </div>

          {/* Macro Bars */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 mb-4 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-400">Daily Macros</h2>
            <MacroBar label="Fat" actual={macros?.actual.fat_g ?? 0} target={macros?.target.fat_g ?? 100} color="#f59e0b" />
            <MacroBar label="Protein" actual={macros?.actual.protein_g ?? 0} target={macros?.target.protein_g ?? 80} color="#3b82f6" />
            <MacroBar label="Net Carbs" actual={macros?.actual.net_carbs_g ?? 0} target={macros?.target.net_carbs_g ?? 20} color="#ef4444" />
            <div className="pt-2 border-t border-zinc-800 flex justify-between text-xs text-zinc-400">
              <span>Calories: {Math.round(macros?.actual.calories ?? 0)} kcal</span>
              <span>Target: {macros?.target.calories ?? 1800} kcal</span>
            </div>
          </div>

          {/* Water */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-semibold text-zinc-400">💧 Water</h2>
              <span className="text-sm font-bold text-blue-400">{macros?.water_ml ?? 0} / {macros?.water_target_ml ?? 3000} ml</span>
            </div>
            <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${waterPct}%`, background: 'linear-gradient(90deg, #3b82f6, #06b6d4)' }} />
            </div>
            <p className="text-xs text-zinc-500 mt-1">{waterPct >= 100 ? '🎉 Goal reached!' : `${Math.round(100 - waterPct)}% remaining`}</p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Link href="/app/keto/log" className="flex flex-col items-center justify-center bg-green-600 hover:bg-green-500 text-white font-semibold rounded-2xl py-4 transition-colors">
              <span className="text-2xl mb-1">📷</span><span className="text-sm">Log Food</span>
            </Link>
            <Link href="/app/keto/meal-plan" className="flex flex-col items-center justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-semibold rounded-2xl py-4 transition-colors">
              <span className="text-2xl mb-1">🥗</span><span className="text-sm">Meal Plan</span>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
