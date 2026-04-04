'use client'

import { useEffect, useState, type FormEvent } from 'react'

const METHOD_EMOJI: Record<string, string> = { call: '📞', visit: '🏠', message: '💬' }
const TYPE_EMOJI: Record<string, string> = { birthday: '🎂', anniversary: '💍', other: '📅' }

interface Contribution {
  id: string
  person_name: string
  amount_kes: number
  description: string
  date: string
}

interface ImportantDate {
  id: string
  name: string
  date: string
  type: string
  person_name: string
  days_until: number
}

interface Checkin {
  id: string
  person_name: string
  method: string
  notes: string | null
  date: string
}

export default function FamilyPage() {
  const currentMonth = new Date().toISOString().slice(0, 7)

  // Data state
  const [totalKes, setTotalKes] = useState(0)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [upcomingDates, setUpcomingDates] = useState<ImportantDate[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(true)

  // Contribution form
  const [cPerson, setCPerson] = useState('')
  const [cAmount, setCAmount] = useState('')
  const [cDesc, setCDesc] = useState('')
  const [cSaving, setCSaving] = useState(false)
  const [cSaved, setCSaved] = useState(false)
  const [cError, setCError] = useState('')

  // Check-in form
  const [ciPerson, setCiPerson] = useState('')
  const [ciMethod, setCiMethod] = useState<'call' | 'visit' | 'message'>('call')
  const [ciNotes, setCiNotes] = useState('')
  const [ciSaving, setCiSaving] = useState(false)
  const [ciSaved, setCiSaved] = useState(false)
  const [ciError, setCiError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/family/contributions?month=${currentMonth}`).then((r) => r.json()),
      fetch('/api/family/dates').then((r) => r.json()),
      fetch('/api/family/checkins').then((r) => r.json()),
    ]).then(([contribData, datesData, checkinsData]) => {
      setTotalKes(contribData.total_kes ?? 0)
      setContributions(contribData.contributions ?? [])
      setUpcomingDates(datesData.upcoming ?? [])
      setCheckins(checkinsData.checkins ?? [])
      setLoading(false)
    })
  }, [currentMonth])

  async function handleAddContribution(e: FormEvent) {
    e.preventDefault()
    setCError('')
    if (!cPerson.trim()) return setCError('Person name is required')
    const amount = parseFloat(cAmount)
    if (!cAmount || isNaN(amount) || amount <= 0) return setCError('Enter a valid amount')
    if (!cDesc.trim()) return setCError('Description is required')

    setCSaving(true)
    const res = await fetch('/api/family/contributions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_name: cPerson.trim(), amount_kes: amount, description: cDesc.trim() }),
    })
    setCSaving(false)
    if (res.ok) {
      const newC = await res.json()
      setContributions([newC, ...contributions])
      setTotalKes(totalKes + amount)
      setCPerson('')
      setCAmount('')
      setCDesc('')
      setCSaved(true)
      setTimeout(() => setCSaved(false), 2000)
    } else {
      const d = await res.json()
      setCError(d.error ?? 'Failed to save')
    }
  }

  async function handleAddCheckin(e: FormEvent) {
    e.preventDefault()
    setCiError('')
    if (!ciPerson.trim()) return setCiError('Person name is required')

    setCiSaving(true)
    const res = await fetch('/api/family/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_name: ciPerson.trim(), method: ciMethod, notes: ciNotes.trim() || undefined }),
    })
    setCiSaving(false)
    if (res.ok) {
      const newCi = await res.json()
      setCheckins([newCi, ...checkins].slice(0, 20))
      setCiPerson('')
      setCiNotes('')
      setCiSaved(true)
      setTimeout(() => setCiSaved(false), 2000)
    } else {
      const d = await res.json()
      setCiError(d.error ?? 'Failed to save')
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Family OS</h1>
      <p className="text-zinc-400 text-sm mb-6">
        {new Date().toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {loading ? (
        <p className="text-zinc-500 text-center mt-20">Loading…</p>
      ) : (
        <>
          {/* Contribution Summary */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Contributions This Month</p>
              <p className="text-lg font-bold text-green-400">KES {totalKes.toLocaleString()}</p>
            </div>
            {contributions.length === 0 ? (
              <p className="text-zinc-600 text-sm">No contributions recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {contributions.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">{c.person_name}</p>
                      <p className="text-xs text-zinc-500">{c.description} · {formatDate(c.date)}</p>
                    </div>
                    <p className="text-sm font-semibold text-green-400">KES {c.amount_kes.toLocaleString()}</p>
                  </div>
                ))}
                {contributions.length > 5 && (
                  <p className="text-xs text-zinc-600 mt-1">+{contributions.length - 5} more</p>
                )}
              </div>
            )}
          </div>

          {/* Add Contribution Form */}
          <form onSubmit={handleAddContribution} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 mb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Log Contribution 💰</p>
            <div className="space-y-2">
              <input
                type="text"
                value={cPerson}
                onChange={(e) => setCPerson(e.target.value)}
                placeholder="Person name"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600"
              />
              <input
                type="number"
                value={cAmount}
                onChange={(e) => setCAmount(e.target.value)}
                placeholder="Amount (KES)"
                min={1}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600"
              />
              <input
                type="text"
                value={cDesc}
                onChange={(e) => setCDesc(e.target.value)}
                placeholder="Description (e.g. school fees, food)"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600"
              />
              {cError && <p className="text-red-400 text-xs">{cError}</p>}
              <button
                type="submit"
                disabled={cSaving}
                className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-colors"
              >
                {cSaved ? '✓ Saved' : cSaving ? 'Saving…' : 'Add Contribution'}
              </button>
            </div>
          </form>

          {/* Upcoming Dates */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 mb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Upcoming Dates (30 days)</p>
            {upcomingDates.length === 0 ? (
              <p className="text-zinc-600 text-sm">No upcoming dates in the next 30 days.</p>
            ) : (
              <div className="space-y-3">
                {upcomingDates.map((d) => (
                  <div key={d.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{TYPE_EMOJI[d.type] ?? '📅'}</span>
                      <div>
                        <p className="text-sm font-semibold text-white">{d.person_name}</p>
                        <p className="text-xs text-zinc-500">{d.name} · {formatDate(d.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {d.days_until === 0 ? (
                        <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">Today!</span>
                      ) : (
                        <span className="text-xs text-zinc-400">{d.days_until}d away</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Check-in Log */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 mb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Recent Check-ins</p>
            {checkins.length === 0 ? (
              <p className="text-zinc-600 text-sm">No check-ins logged yet.</p>
            ) : (
              <div className="space-y-2">
                {checkins.slice(0, 8).map((ci) => (
                  <div key={ci.id} className="flex items-center gap-3">
                    <span className="text-lg">{METHOD_EMOJI[ci.method] ?? '👋'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{ci.person_name}</p>
                      {ci.notes && <p className="text-xs text-zinc-500 truncate">{ci.notes}</p>}
                    </div>
                    <p className="text-xs text-zinc-600 shrink-0">{formatDate(ci.date)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Log Check-in Form */}
          <form onSubmit={handleAddCheckin} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 mb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Log Check-in 👋</p>
            <div className="space-y-2">
              <input
                type="text"
                value={ciPerson}
                onChange={(e) => setCiPerson(e.target.value)}
                placeholder="Person name"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600"
              />
              <div className="flex gap-2">
                {(['call', 'visit', 'message'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCiMethod(m)}
                    className={`flex-1 text-xs py-2 rounded-xl border transition-colors ${
                      ciMethod === m
                        ? 'bg-blue-700 border-blue-600 text-white'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}
                  >
                    {METHOD_EMOJI[m]} {m}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={ciNotes}
                onChange={(e) => setCiNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600"
              />
              {ciError && <p className="text-red-400 text-xs">{ciError}</p>}
              <button
                type="submit"
                disabled={ciSaving}
                className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-colors"
              >
                {ciSaved ? '✓ Saved' : ciSaving ? 'Saving…' : 'Log Check-in'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
