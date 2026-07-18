'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { regeneratePlanAfterLog } from '@/lib/plan-engine/regenerate-plan'
import { getHrZone } from '@/lib/plan-engine/workout-builder'
import { evaluateHrFeedback, HrFeedback } from '@/lib/plan-engine/hr-feedback'
import { formatPace } from '@/lib/utils'
import type { WorkoutType } from '@/lib/plan-engine/types'

export default function EditRunPage() {
  const router = useRouter()
  const params = useParams()
  const logId = params.id as string
  const supabase = createClient()

  const [loading, setLoading]     = useState(false)
  const [fetching, setFetching]   = useState(true)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)
  const [feedback, setFeedback]   = useState<HrFeedback | null>(null)

  // Form fields
  const [date, setDate]               = useState('')
  const [distance, setDistance]       = useState('')
  const [duration, setDuration]       = useState('')
  const [pace, setPace]               = useState('')
  const [hr, setHr]                   = useState('')
  const [notes, setNotes]             = useState('')
  const [feeling, setFeeling]         = useState('3')
  const [workoutType, setWorkoutType] = useState<WorkoutType>('easy')

  // ── Load existing log ────────────────────────────────────────────────────
  useEffect(() => {
    async function loadLog() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: log, error: fetchError } = await supabase
        .from('run_logs')
        .select('*')
        .eq('id', logId)
        .eq('user_id', user.id)   // extra safety, even though RLS enforces this
        .single()

      if (fetchError || !log) {
        setError('Run log not found, or you don\'t have permission to edit it.')
        setFetching(false)
        return
      }

      setDate(log.logged_at?.split('T')[0] ?? '')
      setDistance(String(log.distance_km ?? ''))
      setDuration(log.duration_min ? formatPace(log.duration_min) : '')
      setPace(log.pace_min_per_km ? formatPace(log.pace_min_per_km) : '')
      setHr(log.avg_hr_bpm ? String(log.avg_hr_bpm) : '')
      setNotes(log.notes ?? '')
      setFeeling(String(log.perceived_effort ?? 3))
      setWorkoutType((log.workout_type as WorkoutType) ?? 'easy')
      setFetching(false)
    }
    loadLog()
  }, [logId])

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

    const { error: updateError } = await supabase
      .from('run_logs')
      .update({
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
        workout_type:     workoutType,
      })
      .eq('id', logId)
      .eq('user_id', user.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    // Recompute HR feedback with edited values
    if (hr && pace) {
      const { data: baseline } = await supabase
        .from('user_baselines')
        .select('age_years')
        .eq('user_id', user.id)
        .single()
      const { data: goal } = await supabase
        .from('goals')
        .select('target_hr_bpm, target_pace_min_per_km')
        .eq('user_id', user.id)
        .single()

      const hrZone = getHrZone(workoutType, baseline?.age_years ?? 35, goal?.target_hr_bpm ?? undefined)

      if (hrZone) {
        const result = evaluateHrFeedback({
          workoutType,
          loggedHr:            Number(hr),
          loggedPaceMinPerKm:  parsePaceToNum(pace),
          targetPaceMinPerKm:  goal?.target_pace_min_per_km ?? parsePaceToNum(pace),
          hrZone,
        })
        setFeedback(result)
      }
    }

    // Edited values can shift the 3-run average — recalculate the plan
    await regeneratePlanAfterLog(user.id)

    setSuccess(true)
    router.refresh()
    setTimeout(() => router.push('/dashboard'), feedback ? 3200 : 1800)
  }

  if (fetching) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading run...</p>
      </main>
    )
  }

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800">Run Updated!</h2>

          {feedback && feedback.message && (
            <div className={`mt-4 text-sm px-4 py-3 rounded-xl border text-left ${
              feedback.status === 'warning'      ? 'bg-orange-50 border-orange-200 text-orange-700' :
              feedback.status === 'mild_warning'  ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
              feedback.status === 'good_sign'     ? 'bg-green-50 border-green-200 text-green-700' :
                                                     'bg-gray-50 border-gray-200 text-gray-600'
            }`}>
              {feedback.message}
            </div>
          )}

          <p className="text-gray-500 mt-3 text-sm">Redirecting to dashboard...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-50 to-white px-4 py-12">
      <div className="w-full max-w-lg mx-auto">

        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-2xl">←</Link>
          <div>
            <h1 className="text-2xl font-bold">Edit Run</h1>
            <p className="text-gray-500 text-sm">Update your logged run details</p>
          </div>
        </div>

        <div className="card">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="label">Workout Type</label>
              <div className="flex gap-2">
                {[
                  { v: 'easy',     label: '🟢 Easy' },
                  { v: 'tempo',    label: '🟠 Tempo' },
                  { v: 'long',     label: '🔵 Long' },
                  { v: 'interval', label: '🟣 Interval' },
                ].map(t => (
                  <button
                    key={t.v}
                    type="button"
                    onClick={() => setWorkoutType(t.v as WorkoutType)}
                    className={`flex-1 py-2 rounded-xl border text-sm transition-colors ${
                      workoutType === t.v
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

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

            <div>
              <label className="label">Distance (km)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={distance}
                onChange={e => setDistance(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Duration (mm:ss or minutes)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input"
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

            <div>
              <label className="label">Pace (min/km)</label>
              <input
                type="text"
                className="input"
                value={pace}
                onChange={e => setPace(e.target.value)}
              />
            </div>

            <div>
              <label className="label">
                Average Heart Rate (bpm)
                <span className="text-gray-400 font-normal ml-1">optional</span>
              </label>
              <input
                type="number"
                className="input"
                value={hr}
                onChange={e => setHr(e.target.value)}
              />
            </div>

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

            <div>
              <label className="label">
                Notes
                <span className="text-gray-400 font-normal ml-1">optional</span>
              </label>
              <textarea
                className="input resize-none"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-base py-4"
            >
              {loading ? 'Updating...' : '💾 Update Run'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}