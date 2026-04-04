'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from 'recharts'

interface MacroBreakdown {
  fat_g: number
  protein_g: number
  carbs_g: number
  calories: number
  net_carbs_g: number
  ketosis_impact: 'positive' | 'neutral' | 'negative'
}

interface KetosisStatus {
  level: 'deep' | 'light' | 'borderline' | 'out'
  estimated_score: number
  days_in_ketosis: number
  cheat_risk_score: number
}

interface DailyMacros {
  target: MacroBreakdown
  actual: MacroBreakdown
  water_ml: number
  water_target_ml: number
  ketosis_status: KetosisStatus
}

interface FoodLogEntry {
  id: string
  meal_type: string
  food_items: Array<{ name: string; quantity_g: number }>
  total_macros: MacroBreakdown
  created_at: string
}

const KETOSIS_COLORS: Record<string, string> = {
  deep: '#22c55e',
  light: '#84cc16',
  borderline: '#f59e0b',
  out: '#ef4444',
}

const KETOSIS_LABELS: Record<string, string> = {
  deep: 'Deep Ketosis 🔥',
  light: 'Light Ketosis ✅',
  borderline: 'Borderline ⚠️',
  out: 'Out of Ketosis ❌',
}

export default function KetoPage() {
  const [macros, setMacros] = useState<DailyMacros | null>(null)
  const [logs, setLogs] = useState<FoodLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    Promise.all([
      fetch('/api/keto/macros').then((r) => r.json()),
      fetch(`/api/keto/food-log?date=${today}`).then((r) => r.json()),
    ]).then(([m, l]) => {
      setMacros(m)
      setLogs(Array.isArray(l) ? l : [])
      setLoading(false)
    })
  }, [])

  const ketosisLevel = macros?.ketosis_status?.level ?? 'out'
  const ketosisColor = KETOSIS_COLORS[ketosisLevel]
  const waterPct = macros
    ? Math.min((macros.water_ml / macros.water_target_ml) * 100, 100)
    : 0

  const macroRings = macros
    ? [
        {
          name: 'Fat',
          value: Math.min((macros.actual.fat_g / macros.target.fat_g) * 100, 100),
          fill: '#f59e0b',
          actual: macros.actual.fat_g,
          target: macros.target.fat_g,
          unit: 'g',
        },
        {
          name: 'Protein',
          value: Math.min((macros.actual.protein_g / macros.target.protein_g) * 100, 100),
          fill: '#3b82f6',
          actual: macros.actual.protein_g,
          target: macros.target.protein_g,
          unit: 'g',
        },
        {
          name: 'Net Carbs',
          value: Math.min((macros.actual.net_carbs_g / macros.target.net_carbs_g) * 100, 100),
          fill: '#ef4444',
          actual: macros.actual.net_carbs_g,
          target: macros.target.net_carbs_g,
          unit: 'g',
        },
      ]
    : []

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Keto OS</h1>
      <p className="text-zinc-400 text-sm mb-6">
        {new Date().toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {loading ? (
        <p className="text-zinc-500 text-center mt-20">Loading…</p>
      ) : (
        <>
          {/* Ketosis Status Badge */}
          <div
            className="rounded-2xl p-4 mb-4 flex items-center gap-3"
            style={{ backgroundColor: `${ketosisColor}22`, border: `1px solid ${ketosisColor}44` }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: ketosisColor }}
            />
            <div>
              <p className="font-semibold" style={{ color: ketosisColor }}>
                {KETOSIS_LABELS[ketosisLevel]}
              </p>
              <p className="text-zinc-400 text-xs">
                Score: {macros?.ketosis_status.estimated_score ?? 0}/100 ·{' '}
                {macros?.ketosis_status.days_in_ketosis ?? 0} days in ketosis
              </p>
            </div>
          </div>

          {/* Macro Rings */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 mb-4">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">Daily Macros</h2>
            <div className="grid grid-cols-3 gap-3">
              {macroRings.map((ring) => (
                <div key={ring.name} className="flex flex-col items-center">
                  <div className="w-20 h-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="55%"
                        outerRadius="100%"
                        data={[{ value: ring.value, fill: ring.fill }]}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <RadialBar dataKey="value" background={{ fill: '#27272a' }} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs font-semibold mt-1" style={{ color: ring.fill }}>
                    {ring.name}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {Math.round(ring.actual)}/{ring.target}{ring.unit}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-between text-xs text-zinc-400">
              <span>Calories: {Math.round(macros?.actual.calories ?? 0)} / {macros?.target.calories ?? 1800} kcal</span>
              <span>Net Carbs: {Math.round(macros?.actual.net_carbs_g ?? 0)}g</span>
            </div>
          </div>

          {/* Water Tracker */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-semibold text-zinc-400">💧 Water</h2>
              <span className="text-sm font-bold text-blue-400">
                {macros?.water_ml ?? 0} / {macros?.water_target_ml ?? 3000} ml
              </span>
            </div>
            <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${waterPct}%`,
                  background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                }}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {waterPct >= 100 ? '🎉 Goal reached!' : `${Math.round(100 - waterPct)}% remaining`}
            </p>
          </div>

          {/* Today's Food Log */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 mb-4">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">Today's Food Log</h2>
            {logs.length === 0 ? (
              <p className="text-zinc-600 text-sm text-center py-4">No entries yet</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex justify-between items-start py-2 border-b border-zinc-900 last:border-0">
                    <div>
                      <p className="text-xs font-semibold text-zinc-300 capitalize">{log.meal_type}</p>
                      <p className="text-xs text-zinc-500">
                        {log.food_items.map((fi) => fi.name).join(', ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-300">{Math.round(log.total_macros.calories)} kcal</p>
                      <p className="text-xs text-zinc-500">{Math.round(log.total_macros.net_carbs_g)}g net carbs</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Log Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/app/keto/log?tab=photo"
              className="flex flex-col items-center justify-center bg-green-600 hover:bg-green-500 text-white font-semibold rounded-2xl py-4 transition-colors"
            >
              <span className="text-2xl mb-1">📷</span>
              <span className="text-sm">Photo</span>
            </Link>
            <Link
              href="/app/keto/log?tab=manual"
              className="flex flex-col items-center justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-semibold rounded-2xl py-4 transition-colors"
            >
              <span className="text-2xl mb-1">✏️</span>
              <span className="text-sm">Manual</span>
            </Link>
          </div>

          {/* Meal Plan Link */}
          <Link
            href="/app/keto/meal-plan"
            className="mt-3 flex items-center justify-between bg-zinc-950 border border-zinc-900 rounded-2xl p-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🥗</span>
              <div>
                <p className="font-semibold text-sm">Weekly Meal Plan</p>
                <p className="text-xs text-zinc-500">Kenya-specific · KES 5,000/month</p>
              </div>
            </div>
            <span className="text-zinc-500">›</span>
          </Link>
        </>
      )}
    </div>
  )
}
