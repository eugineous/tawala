'use client'

import { useState, useEffect } from 'react'

interface PurchaseDecision {
  approved: boolean
  type: 'APPROVED' | 'PAUSE' | 'STILL_PAUSED' | 'OVER_BUDGET' | 'CAUTION'
  reasoning: string
  warning?: string
  remaining?: number
  pause?: {
    unlock_at: string
    item_name: string
    amount_kes: number
  }
}

const CATEGORIES = [
  'food',
  'transport',
  'rent',
  'utilities',
  'entertainment',
  'health',
  'savings',
  'investment',
  'family_support',
  'tithe',
  'other',
]

const DECISION_STYLES: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  APPROVED: { bg: 'bg-green-950', border: 'border-green-700', icon: '✅', label: 'Approved' },
  PAUSE: { bg: 'bg-amber-950', border: 'border-amber-700', icon: '⏸️', label: '24-Hour Pause' },
  STILL_PAUSED: { bg: 'bg-amber-950', border: 'border-amber-700', icon: '⏳', label: 'Still Paused' },
  OVER_BUDGET: { bg: 'bg-red-950', border: 'border-red-700', icon: '🚫', label: 'Over Budget' },
  CAUTION: { bg: 'bg-yellow-950', border: 'border-yellow-700', icon: '⚠️', label: 'Caution' },
}

function Countdown({ unlockAt }: { unlockAt: string }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    function update() {
      const diff = new Date(unlockAt).getTime() - Date.now()
      if (diff <= 0) {
        setRemaining('Unlocked!')
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(`${h}h ${m}m ${s}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [unlockAt])

  return (
    <div className="mt-3 text-center">
      <p className="text-xs text-zinc-400">Unlocks in</p>
      <p className="text-2xl font-mono font-bold text-amber-400">{remaining}</p>
      <p className="text-xs text-zinc-500 mt-1">
        {new Date(unlockAt).toLocaleString()}
      </p>
    </div>
  )
}

export default function ApprovePurchasePage() {
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('other')
  const [loading, setLoading] = useState(false)
  const [decision, setDecision] = useState<PurchaseDecision | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!item || !amount) return
    setLoading(true)
    setDecision(null)

    const res = await fetch('/api/finance/approve-purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item, amount_kes: parseFloat(amount), category }),
    })
    const data = await res.json()
    setDecision(data)
    setLoading(false)
  }

  const style = decision ? DECISION_STYLES[decision.type] : null

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Should I Buy This?</h1>
      <p className="text-zinc-400 text-sm mb-6">
        AI-powered purchase approval
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Item name</label>
          <input
            type="text"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="e.g. New headphones"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">
            Amount (KES)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            min="1"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-xl py-4 transition-colors"
        >
          {loading ? 'Evaluating…' : 'Ask TAWALA'}
        </button>
      </form>

      {decision && style && (
        <div
          className={`${style.bg} border ${style.border} rounded-2xl p-5`}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{style.icon}</span>
            <span className="font-bold text-lg">{style.label}</span>
          </div>

          <p className="text-sm text-zinc-200 leading-relaxed">
            {decision.reasoning}
          </p>

          {decision.warning && (
            <p className="mt-2 text-xs text-yellow-400">{decision.warning}</p>
          )}

          {decision.remaining !== undefined && (
            <p className="mt-2 text-xs text-zinc-400">
              Remaining in category: KES {decision.remaining.toLocaleString()}
            </p>
          )}

          {(decision.type === 'PAUSE' || decision.type === 'STILL_PAUSED') &&
            decision.pause?.unlock_at && (
              <Countdown unlockAt={decision.pause.unlock_at} />
            )}
        </div>
      )}
    </div>
  )
}
