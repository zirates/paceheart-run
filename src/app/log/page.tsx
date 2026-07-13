'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { regeneratePlanAfterLog } from '@/lib/plan-engine/regenerate-plan'

export default function LogRunPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [distance, setDistance] = useState('')
  const [duration, setDuration] = useState('')
  const [pace, setPace] = useState('')
  const [hr, setHr] = useState('')
  const [notes, setNotes] = useState('')
  const [feeling, setFeeling] = useState('3')

  function calcPace() {
    if (!distance || !duration) return
    const [mins, secs] = duration.split(':').map(Number)
    if (isNaN(mins)) return
    const totalMins = mins + (secs || 0) / 60
    const paceNum = totalMins / Number(distance)
    const pMins = Math.floor(paceNum)
    const pSecs = Math.round((paceNum - pMins) * 60)
    setPace(`${pMins}:${pSecs.toString().padStart(2, '0')}`)
  }

  function parsePaceToNum(p: string) {
    const [m, s] = p.split(':').map(Number)
    return m + (s || 0) / 60
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { error: logError } = await supabase.from('run_logs').insert({
      user_id:          user.id,
      logged_at:        date,
      distance_km:      Number(distance),
      duration_min:     (() => {
        const [m, s] = duration.split(':').map(Number)
        return m + (s || 0) / 60
      })(),
      pace_min_per_km:  pace ? parsePaceToNum(pace) : null,
      avg_hr_bpm:       hr ? Number(hr) : null,
      perceived_effort: Number(feeling),
      notes:            notes || null,
    })

    if (logError) {
      setError(logError.message)
      setLoading(false)
      return
    }

    await regeneratePlanAfterLog(user.id)

    setSuccess(true)
    router.refresh()                                    // ← ADD
    setTimeout(() => router.push('/dashboard'), 1800)  // ← bump to 1800ms
  }

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800">Run Logged!</h2>
          <p className="text-gray-500 mt-2">Redirecting to dashboard...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-50 to-white px-4 py-12">
      <div className="w-full max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-2xl">←</Link>
          <div>
            <h1 className="text-2xl font-bold">Log a Run</h1>
            <p className="text-gray-500 text-sm">Track your progress over time</p>
          </div>
        </div>

        <div className="card">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Date */}
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>

            {/* Distance */}
            <div>
              <label className="label">Distance (km)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                placeholder="e.g. 5.2"
                value={distance}
                onChange={e => setDistance(e.target.value)}
                required
              />
            </div>

            {/* Duration */}
            <div>
              <label className="label">Duration (mm:ss or minutes)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. 32:30"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={calcPace}
                  className="btn-secondary text-sm px-4 whitespace-nowrap"
                >
                  Calc Pace
                </button>
              </div>
            </div>

            {/* Pace */}
            <div>
              <label className="label">Pace (min/km)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 6:15 (auto-filled above)"
                value={pace}
                onChange={e => setPace(e.target.value)}
              />
            </div>

            {/* Heart Rate */}
            <div>
              <label className="label">
                Average Heart Rate (bpm)
                <span className="text-gray-400 font-normal ml-1">optional</span>
              </label>
              <input
                type="number"
                className="input"
                placeholder="e.g. 148"
                value={hr}
                onChange={e => setHr(e.target.value)}
              />
            </div>

            {/* Feeling / RPE */}
            <div>
              <label className="label">How did it feel? (1–5)</label>
              <div className="flex gap-2">
                {[
                  { v: '1', label: '😴', desc: 'Very Easy' },
                  { v: '2', label: '😊', desc: 'Easy' },
                  { v: '3', label: '😐', desc: 'Moderate' },
                  { v: '4', label: '😤', desc: 'Hard' },
                  { v: '5', label: '🥵', desc: 'Max' },
                ].map(f => (
                  <button
                    key={f.v}
                    type="button"
                    onClick={() => setFeeling(f.v)}
                    className={`flex-1 py-2 rounded-xl border text-center transition-colors ${
                      feeling === f.v
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xl">{f.label}</div>
                    <div className="text-xs mt-0.5">{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="label">
                Notes
                <span className="text-gray-400 font-normal ml-1">optional</span>
              </label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="How did the run go? Any observations..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-base py-4"
            >
              {loading ? 'Saving...' : '💾 Save Run'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
