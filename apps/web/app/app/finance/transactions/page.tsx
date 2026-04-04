'use client'

import { useEffect, useRef, useState } from 'react'

interface Transaction {
  id: string
  amount_kes: number
  type: string
  category: string
  description: string
  date: string
  mpesa_ref: string | null
}

interface BudgetAllocation {
  allocations: Record<string, number>
  actual_spent: Record<string, number>
}

const CATEGORY_ICONS: Record<string, string> = {
  food: '🍽️',
  transport: '🚌',
  rent: '🏠',
  utilities: '💡',
  entertainment: '🎬',
  health: '💊',
  savings: '💰',
  investment: '📈',
  family_support: '👨‍👩‍👧',
  tithe: '⛪',
  other: '📦',
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budget, setBudget] = useState<BudgetAllocation | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/finance/transactions?page=1&limit=50').then((r) => r.json()),
      fetch('/api/finance/budget').then((r) => r.json()),
    ]).then(([t, b]) => {
      setTransactions(t.transactions ?? [])
      setBudget(b)
      setLoading(false)
    })
  }, [])

  const overBudgetCategories = budget
    ? Object.entries(budget.allocations).filter(
        ([cat, alloc]) => (budget.actual_spent[cat] ?? 0) > alloc
      )
    : []

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    setScanResult(null)

    const form = new FormData()
    form.append('image', file)

    const res = await fetch('/api/finance/scan-mpesa', {
      method: 'POST',
      body: form,
    })
    const data = await res.json()

    if (data.error === 'UNREADABLE') {
      setScanResult('Could not read the screenshot. Please try a clearer image.')
    } else {
      setScanResult(
        `Imported ${data.count} transaction${data.count !== 1 ? 's' : ''} from M-Pesa screenshot.`
      )
      // Refresh transactions
      const updated = await fetch('/api/finance/transactions?page=1&limit=50').then((r) => r.json())
      setTransactions(updated.transactions ?? [])
    }
    setScanning(false)
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Transactions</h1>
      <p className="text-zinc-400 text-sm mb-4">Your recent spending</p>

      {/* Over-budget warnings */}
      {overBudgetCategories.length > 0 && (
        <div className="bg-red-950 border border-red-800 rounded-xl p-3 mb-4">
          <p className="text-red-400 font-semibold text-sm mb-1">
            ⚠️ OVER BUDGET
          </p>
          {overBudgetCategories.map(([cat]) => (
            <p key={cat} className="text-red-300 text-xs">
              {cat} is over budget
            </p>
          ))}
        </div>
      )}

      {/* Scan M-Pesa */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 mb-4">
        <p className="text-sm font-semibold mb-2">Scan M-Pesa Screenshot</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleScan}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
          className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-colors"
        >
          {scanning ? 'Scanning…' : '📷 Upload M-Pesa Screenshot'}
        </button>
        {scanResult && (
          <p className="text-xs mt-2 text-zinc-300">{scanResult}</p>
        )}
      </div>

      {/* Transaction list */}
      {loading ? (
        <p className="text-zinc-500 text-center mt-10">Loading…</p>
      ) : transactions.length === 0 ? (
        <p className="text-zinc-500 text-center mt-10">No transactions yet.</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {CATEGORY_ICONS[tx.category] ?? '📦'}
                </span>
                <div>
                  <p className="text-sm font-medium leading-tight">
                    {tx.description}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {tx.category} · {tx.date}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`font-semibold text-sm ${
                    tx.type === 'income' ? 'text-green-400' : 'text-white'
                  }`}
                >
                  {tx.type === 'income' ? '+' : '-'}KES{' '}
                  {tx.amount_kes.toLocaleString()}
                </p>
                {tx.mpesa_ref && (
                  <p className="text-[10px] text-zinc-600">{tx.mpesa_ref}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
