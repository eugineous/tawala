'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useRef, Suspense } from 'react'

interface MacroResult {
  fat_g: number
  protein_g: number
  carbs_g: number
  calories: number
  net_carbs_g: number
  ketosis_impact: 'positive' | 'neutral' | 'negative'
  items?: Array<{ name: string; quantity_g: number }>
  message?: string
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

const IMPACT_COLORS = {
  positive: '#22c55e',
  neutral: '#f59e0b',
  negative: '#ef4444',
}

function LogPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = searchParams.get('tab') === 'manual' ? 'manual' : 'photo'
  const [tab, setTab] = useState<'photo' | 'manual'>(initialTab)

  // Photo tab state
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoMealType, setPhotoMealType] = useState('snack')
  const [photoResult, setPhotoResult] = useState<MacroResult | null>(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Manual tab state
  const [manualMealType, setManualMealType] = useState('lunch')
  const [foodItems, setFoodItems] = useState([{ name: '', quantity_g: 100 }])
  const [manualResult, setManualResult] = useState<MacroResult | null>(null)
  const [manualLoading, setManualLoading] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setPhotoResult(null)
  }

  async function handlePhotoScan() {
    if (!photoFile) return
    setPhotoLoading(true)
    try {
      const fd = new FormData()
      fd.append('image', photoFile)
      fd.append('meal_type', photoMealType)
      const res = await fetch('/api/keto/log-food-photo', { method: 'POST', body: fd })
      const data = await res.json()
      setPhotoResult(data)
    } catch {
      setPhotoResult(null)
    } finally {
      setPhotoLoading(false)
    }
  }

  async function handleManualLog() {
    const validItems = foodItems.filter((fi) => fi.name.trim())
    if (!validItems.length) return
    setManualLoading(true)
    try {
      const res = await fetch('/api/keto/food-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_type: manualMealType, food_items: validItems }),
      })
      const data = await res.json()
      setManualResult(data?.total_macros ?? null)
      if (data?.id) {
        setTimeout(() => router.push('/app/keto'), 1500)
      }
    } catch {
      setManualResult(null)
    } finally {
      setManualLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white text-xl">‹</button>
        <h1 className="text-xl font-bold">Log Food</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-zinc-900 rounded-xl p-1 mb-6">
        {(['photo', 'manual'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
              tab === t ? 'bg-green-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t === 'photo' ? '📷 Photo' : '✏️ Manual'}
          </button>
        ))}
      </div>

      {tab === 'photo' && (
        <div className="space-y-4">
          {/* Meal type */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Meal Type</label>
            <div className="flex gap-2 flex-wrap">
              {MEAL_TYPES.map((mt) => (
                <button
                  key={mt}
                  onClick={() => setPhotoMealType(mt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    photoMealType === mt
                      ? 'bg-green-600 text-white'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  {mt}
                </button>
              ))}
            </div>
          </div>

          {/* Upload area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-700 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-green-600 transition-colors"
          >
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Food preview" className="max-h-48 rounded-xl object-cover" />
            ) : (
              <>
                <span className="text-4xl mb-2">📷</span>
                <p className="text-zinc-400 text-sm">Tap to take or upload a photo</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            onClick={handlePhotoScan}
            disabled={!photoFile || photoLoading}
            className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold rounded-xl transition-colors"
          >
            {photoLoading ? 'Scanning…' : 'Scan Food'}
          </button>

          {/* Results */}
          {photoResult && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 space-y-3">
              {photoResult.message ? (
                <p className="text-zinc-400 text-sm text-center">{photoResult.message}</p>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: IMPACT_COLORS[photoResult.ketosis_impact] }}
                    />
                    <span className="text-xs font-semibold capitalize" style={{ color: IMPACT_COLORS[photoResult.ketosis_impact] }}>
                      {photoResult.ketosis_impact} ketosis impact
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-zinc-900 rounded-lg p-2">
                      <p className="text-zinc-500">Calories</p>
                      <p className="font-bold text-white">{Math.round(photoResult.calories)} kcal</p>
                    </div>
                    <div className="bg-zinc-900 rounded-lg p-2">
                      <p className="text-zinc-500">Net Carbs</p>
                      <p className="font-bold text-red-400">{Math.round(photoResult.net_carbs_g)}g</p>
                    </div>
                    <div className="bg-zinc-900 rounded-lg p-2">
                      <p className="text-zinc-500">Fat</p>
                      <p className="font-bold text-amber-400">{Math.round(photoResult.fat_g)}g</p>
                    </div>
                    <div className="bg-zinc-900 rounded-lg p-2">
                      <p className="text-zinc-500">Protein</p>
                      <p className="font-bold text-blue-400">{Math.round(photoResult.protein_g)}g</p>
                    </div>
                  </div>
                  {photoResult.items && photoResult.items.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Detected items:</p>
                      {photoResult.items.map((item, i) => (
                        <p key={i} className="text-xs text-zinc-300">• {item.name} ({item.quantity_g}g)</p>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => router.push('/app/keto')}
                    className="w-full py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    Done ✓
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'manual' && (
        <div className="space-y-4">
          {/* Meal type */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Meal Type</label>
            <div className="flex gap-2 flex-wrap">
              {MEAL_TYPES.map((mt) => (
                <button
                  key={mt}
                  onClick={() => setManualMealType(mt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    manualMealType === mt
                      ? 'bg-green-600 text-white'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  {mt}
                </button>
              ))}
            </div>
          </div>

          {/* Food items */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400">Food Items</label>
            {foodItems.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Food name (e.g. Avocado)"
                  value={item.name}
                  onChange={(e) => {
                    const updated = [...foodItems]
                    updated[idx] = { ...updated[idx], name: e.target.value }
                    setFoodItems(updated)
                  }}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-600"
                />
                <input
                  type="number"
                  placeholder="g"
                  value={item.quantity_g}
                  onChange={(e) => {
                    const updated = [...foodItems]
                    updated[idx] = { ...updated[idx], quantity_g: Number(e.target.value) }
                    setFoodItems(updated)
                  }}
                  className="w-20 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-600"
                />
                {foodItems.length > 1 && (
                  <button
                    onClick={() => setFoodItems(foodItems.filter((_, i) => i !== idx))}
                    className="text-zinc-600 hover:text-red-400 px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setFoodItems([...foodItems, { name: '', quantity_g: 100 }])}
              className="text-xs text-green-500 hover:text-green-400"
            >
              + Add item
            </button>
          </div>

          <button
            onClick={handleManualLog}
            disabled={manualLoading || !foodItems.some((fi) => fi.name.trim())}
            className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold rounded-xl transition-colors"
          >
            {manualLoading ? 'Calculating…' : 'Log & Calculate Macros'}
          </button>

          {/* Results */}
          {manualResult && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: IMPACT_COLORS[manualResult.ketosis_impact] }}
                />
                <span className="text-xs font-semibold capitalize" style={{ color: IMPACT_COLORS[manualResult.ketosis_impact] }}>
                  {manualResult.ketosis_impact} ketosis impact
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-zinc-900 rounded-lg p-2">
                  <p className="text-zinc-500">Calories</p>
                  <p className="font-bold text-white">{Math.round(manualResult.calories)} kcal</p>
                </div>
                <div className="bg-zinc-900 rounded-lg p-2">
                  <p className="text-zinc-500">Net Carbs</p>
                  <p className="font-bold text-red-400">{Math.round(manualResult.net_carbs_g)}g</p>
                </div>
                <div className="bg-zinc-900 rounded-lg p-2">
                  <p className="text-zinc-500">Fat</p>
                  <p className="font-bold text-amber-400">{Math.round(manualResult.fat_g)}g</p>
                </div>
                <div className="bg-zinc-900 rounded-lg p-2">
                  <p className="text-zinc-500">Protein</p>
                  <p className="font-bold text-blue-400">{Math.round(manualResult.protein_g)}g</p>
                </div>
              </div>
              <p className="text-xs text-green-400 text-center">✓ Logged successfully</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function LogPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading…</div>}>
      <LogPageContent />
    </Suspense>
  )
}
