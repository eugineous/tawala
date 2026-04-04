'use client'

import { useState } from 'react'
import Link from 'next/link'

interface DecisionResult {
  recommendation: string
  reasoning: string
  pros: string[]
  cons: string[]
  risk_level: 'low' | 'medium' | 'high'
  confidence_score: number
}

const riskColors = {
  low: 'text-emerald-400 border-emerald-800/40 bg-emerald-900/20',
  medium: 'text-amber-400 border-amber-800/40 bg-amber-900/20',
  high: 'text-red-400 border-red-800/40 bg-red-900/20',
}

const riskLabels = {
  low: '🟢 Low Risk',
  medium: '🟡 Medium Risk',
  high: '🔴 High Risk',
}

export default function DecisionPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [context, setContext] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [result, setResult] = useState<DecisionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addOption = () => setOptions((prev) => [...prev, ''])
  const removeOption = (i: number) => setOptions((prev) => prev.filter((_, idx) => idx !== i))
  const updateOption = (i: number, val: string) =>
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const filteredOptions = options.filter((o) => o.trim())
      const res = await fetch('/api/goals/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          options: filteredOptions.length ? filteredOptions : undefined,
          context: context.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to evaluate decision')
      }

      const data: DecisionResult = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setResult(null)
    setTitle('')
    setDescription('')
    setContext('')
    setOptions(['', ''])
    setError(null)
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app/goals" className="text-zinc-400 hover:text-white transition-colors">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">Decision Evaluator</h1>
      </div>

      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider">
              Decision Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Should I take this freelance project?"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider">
              Describe the Decision *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the situation, what you're deciding, and why it matters…"
              rows={4}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-zinc-400 uppercase tracking-wider">
                Options (optional)
              </label>
              <button
                type="button"
                onClick={addOption}
                className="text-xs text-zinc-500 hover:text-white transition-colors"
              >
                + Add option
              </button>
            </div>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="text-zinc-600 hover:text-red-400 transition-colors px-2"
                      aria-label="Remove option"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider">
              Additional Context (optional)
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Any constraints, deadlines, or relevant background…"
              rows={2}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !title.trim() || !description.trim()}
            className="w-full bg-white text-black font-semibold rounded-xl py-3.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-100 transition-colors"
          >
            {loading ? '🤔 Evaluating with Gemini…' : '🎯 Evaluate Decision'}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Recommendation */}
          <div className="bg-zinc-950 border border-emerald-900/50 rounded-2xl p-5">
            <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2">Recommendation</p>
            <p className="text-base font-semibold text-white leading-relaxed">
              {result.recommendation}
            </p>
          </div>

          {/* Risk + Confidence */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`rounded-2xl border p-4 text-center ${riskColors[result.risk_level]}`}
            >
              <p className="text-xs uppercase tracking-wider mb-1 opacity-70">Risk Level</p>
              <p className="text-sm font-bold">{riskLabels[result.risk_level]}</p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Confidence</p>
              <p className="text-2xl font-bold text-white">
                {result.confidence_score}
                <span className="text-sm text-zinc-500">%</span>
              </p>
            </div>
          </div>

          {/* Reasoning */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Reasoning</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{result.reasoning}</p>
          </div>

          {/* Pros & Cons */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
              <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2">✅ Pros</p>
              <ul className="space-y-1.5">
                {result.pros.map((pro, i) => (
                  <li key={i} className="text-xs text-zinc-300 leading-relaxed">
                    • {pro}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
              <p className="text-xs text-red-400 uppercase tracking-wider mb-2">❌ Cons</p>
              <ul className="space-y-1.5">
                {result.cons.map((con, i) => (
                  <li key={i} className="text-xs text-zinc-300 leading-relaxed">
                    • {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={reset}
              className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-medium rounded-xl py-3 text-sm transition-colors"
            >
              Evaluate Another
            </button>
            <Link
              href="/app/goals"
              className="flex-1 bg-white text-black font-medium rounded-xl py-3 text-sm text-center hover:bg-zinc-100 transition-colors"
            >
              Back to Goals
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
