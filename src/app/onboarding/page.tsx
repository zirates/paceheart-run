'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { deriveRunnerLevel } from '@/lib/plan-engine/derive-level'
import { RACE_DISTANCES } from '@/lib/constants'

const STEPS = ['Baseline', 'Your Goal', 'Heart Rate', 'Review']

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1 — Baseline
  const [pace, setPace] = useState('6:30')
  const [distance, setDistance] = useState('5')
  const [days, setDays] = useState('3')
  const [rpe, setRpe] = useState('6')
  const [age, setAge] = useState('')
  const [pbPace, setPbPace] = useState('')       // ← NEW
  const [pbHr, setPbHr] = useState('')           // ← NEW

  // Step 2 — Goal
  const [goalDistance, setGoalDistance] = useState('5k')
  const [goalPace, setGoalPace] = useState('6:00')
  const [weeks, setWeeks] = useState('8')

  // Step 3 — Heart Rate (optional)
  const [hrEasy, setHrEasy] = useState('')
  const [hrTarget, setHrTarget] = useState('')

  function parsePaceToNum(p: string) {
    const [m, s] = p.split(':').map(Number)
    return m + (s || 0) / 60
  }

  async function handleFinish() {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const level = deriveRunnerLevel(
      parsePaceToNum(pace),
      Number(days),
      Number(rpe),
      Number(distance)
    )

    const baseline = {
      user_id:                  user.id,
      current_pace_min_per_km:  parsePaceToNum(pace),
      current_avg_distance_km:  Number(distance),
      weekly_run_days:          Number(days),
      rpe:                      Number(rpe),
      age_years:                age ? Number(age) : null,
      current_hr_easy:          hrEasy ? Number(hrEasy) : null,
      derived_level:            level,
      pb_pace_min_per_km:       pbPace ? parsePaceToNum(pbPace) : null,  // ← NEW
      pb_hr_bpm:                pbHr ? Number(pbHr) : null,              // ← NEW
    }

    const goal = {
      user_id:                user.id,
      distance:               goalDistance,
      target_pace_min_per_km: parsePaceToNum(goalPace),
      deadline_weeks:         Number(weeks),
      target_hr_bpm:          hrTarget ? Number(hrTarget) : null,
    }

    const { error: bErr } = await supabase
      .from('user_baselines')
      .upsert(baseline, { onConflict: 'user_id' })
    if (bErr) { setError(bErr.message); setLoading(false); return }

    const { error: gErr } = await supabase
      .from('goals')
      .upsert(goal, { onConflict: 'user_id' })
    if (gErr) { setError(gErr.message); setLoading(false); return }

    window.location.href = '/dashboard'
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-3xl">❤️</span>
          <span className="font-bold text-2xl text-brand-700 ml-2">PaceHeart</span>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                i < step ? 'bg-brand-600 text-white' :
                i === step ? 'bg-brand-600 text-white ring-4 ring-brand-100' :
                'bg-gray-200 text-gray-500'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${i < step ? 'bg-brand-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="card">

          {/* STEP 0 — Baseline */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Tell us about your current running</h2>
              <p className="text-gray-500 text-sm">Be honest — this helps us build the right plan for you.</p>

              <div>
                <label className="label">Current easy run pace (min/km)</label>
                <input className="input" placeholder="e.g. 6:30" value={pace}
                  onChange={e => setPace(e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">Format: minutes:seconds (e.g. 6:30)</p>
              </div>

              <div>
                <label className="label">Average run distance (km)</label>
                <input className="input" type="number" placeholder="e.g. 5" value={distance}
                  onChange={e => setDistance(e.target.value)} />
              </div>

              <div>
                <label className="label">Days you run per week</label>
                <select className="input" value={days} onChange={e => setDays(e.target.value)}>
                  {[1,2,3,4,5,6,7].map(d => (
                    <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">How hard does your easy run feel? (RPE 1–10)</label>
                <input className="input" type="number" min="1" max="10" placeholder="e.g. 6" value={rpe}
                  onChange={e => setRpe(e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">1 = very easy, 10 = maximum effort</p>
              </div>

              <div>
                <label className="label">Age <span className="text-gray-400 font-normal">(optional)</span></label>
                <input className="input" type="number" placeholder="e.g. 28" value={age}
                  onChange={e => setAge(e.target.value)} />
              </div>

              {/* ── NEW: Personal Best section ─────────────────────────── */}
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-0.5">
                    Personal Best <span className="text-gray-400 font-normal">(optional)</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Helps us set smarter interval & tempo targets for your plan.
                  </p>
                </div>

                <div>
                  <label className="label">
                    Best pace you&apos;ve ever run (min/km)
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. 5:10"
                    value={pbPace}
                    onChange={e => setPbPace(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Your fastest sustained pace — a race, time trial, or hard effort
                  </p>
                </div>

                <div>
                  <label className="label">
                    Heart rate during that effort (bpm)
                  </label>
                  <input
                    className="input"
                    type="number"
                    placeholder="e.g. 178"
                    value={pbHr}
                    onChange={e => setPbHr(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Helps estimate your max HR for zone calculations
                  </p>
                </div>
              </div>
              {/* ── END NEW ────────────────────────────────────────────── */}

            </div>
          )}

          {/* STEP 1 — Goal */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">What&apos;s your race goal?</h2>
              <p className="text-gray-500 text-sm">We&apos;ll build a plan to get you there.</p>

              <div>
                <label className="label">Target race distance</label>
                <select className="input" value={goalDistance} onChange={e => setGoalDistance(e.target.value)}>
                  {RACE_DISTANCES.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Target pace (min/km)</label>
                <input className="input" placeholder="e.g. 6:00" value={goalPace}
                  onChange={e => setGoalPace(e.target.value)} />
              </div>

              <div>
                <label className="label">Training weeks available</label>
                <select className="input" value={weeks} onChange={e => setWeeks(e.target.value)}>
                  {[4,6,8,10,12,16,20,24].map(w => (
                    <option key={w} value={w}>{w} weeks</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* STEP 2 — Heart Rate */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">
                Heart Rate Goals <span className="text-gray-400 font-normal text-base">(optional)</span>
              </h2>
              <p className="text-gray-500 text-sm">
                Skip this if you don&apos;t have a HR monitor. You can add it later.
              </p>

              <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm text-brand-700">
                💡 <strong>The PaceHeart advantage:</strong> By tracking HR alongside pace,
                we can show you when you&apos;re running the same pace at a lower HR —
                proof your fitness is improving!
              </div>

              <div>
                <label className="label">Current easy run heart rate (bpm)</label>
                <input className="input" type="number" placeholder="e.g. 155" value={hrEasy}
                  onChange={e => setHrEasy(e.target.value)} />
              </div>

              <div>
                <label className="label">Target easy run heart rate (bpm)</label>
                <input className="input" type="number" placeholder="e.g. 140" value={hrTarget}
                  onChange={e => setHrTarget(e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">
                  Typically 60–70% of max HR. Max HR ≈ 220 − age
                </p>
              </div>
            </div>
          )}

          {/* STEP 3 — Review */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Review your profile</h2>
              <p className="text-gray-500 text-sm">Everything look right? We&apos;ll generate your plan now.</p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <div className="space-y-2 text-sm">
                {[
                  ['Current Pace',   `${pace} min/km`],
                  ['Avg Distance',   `${distance} km`],
                  ['Days/Week',      `${days} days`],
                  ['RPE',            `${rpe}/10`],
                  ['Personal Best',  pbPace ? `${pbPace} min/km` : 'Not set'],  // ← NEW
                  ['PB Heart Rate',  pbHr   ? `${pbHr} bpm`     : 'Not set'],  // ← NEW
                  ['Goal Distance',  RACE_DISTANCES.find(d => d.value === goalDistance)?.label],
                  ['Target Pace',    `${goalPace} min/km`],
                  ['Training Period',`${weeks} weeks`],
                  ['Current HR',     hrEasy  ? `${hrEasy} bpm`  : 'Not set'],
                  ['Target HR',      hrTarget ? `${hrTarget} bpm` : 'Not set'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                🏃 Your level:{' '}
                <strong className="text-brand-600 capitalize">
                  {deriveRunnerLevel(parsePaceToNum(pace), Number(days), Number(rpe), Number(distance))}
                </strong>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="btn-secondary disabled:opacity-0"
            >
              ← Back
            </button>

            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(s => s + 1)} className="btn-primary">
                Next →
              </button>
            ) : (
              <button onClick={handleFinish} disabled={loading} className="btn-primary">
                {loading ? 'Generating plan...' : '🚀 Generate My Plan'}
              </button>
            )}
          </div>

        </div>
      </div>
    </main>
  )
}