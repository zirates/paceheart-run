'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPace } from '@/lib/utils'
import type { TrainingPlan } from '@/lib/plan-engine/types'

interface RunLog {
  logged_at: string
  distance_km: number
  pace_min_per_km: number
  avg_hr_bpm?: number
}

interface Goal {
  distance: string
  deadline_weeks: number
  target_pace_min_per_km: number
  target_hr_bpm?: number
}

interface Baseline {
  pb_pace_min_per_km?: number
  pb_hr_bpm?: number
}

interface Props {
  plan: TrainingPlan
  logs: RunLog[]
  userName: string
  goal: Goal
  baseline: Baseline
}

const WORKOUT_COLORS: Record<string, string> = {
  easy:     'bg-green-100 text-green-700 border-green-200',
  tempo:    'bg-orange-100 text-orange-700 border-orange-200',
  long:     'bg-blue-100 text-blue-700 border-blue-200',
  interval: 'bg-purple-100 text-purple-700 border-purple-200',
  rest:     'bg-gray-100 text-gray-500 border-gray-200',
}

const HR_ZONE_COLORS: Record<number, string> = {
  1: 'bg-gray-200 text-gray-600',
  2: 'bg-green-200 text-green-800',
  3: 'bg-yellow-200 text-yellow-800',
  4: 'bg-orange-200 text-orange-800',
  5: 'bg-red-200 text-red-800',
}

const WORKOUT_ICONS: Record<string, string> = {
  easy: '🟢', tempo: '🟠', long: '🔵', interval: '🟣', rest: '⬜',
}

// ── Feasibility banner config ─────────────────────────────────────────────────
const FEASIBILITY_BANNER: Record<string, { bg: string; icon: string }> = {
  on_track:    { bg: 'bg-green-50 border-green-200 text-green-800',   icon: '🎉' },
  reachable:   { bg: 'bg-blue-50 border-blue-200 text-blue-800',      icon: '💪' },
  ambitious:   { bg: 'bg-yellow-50 border-yellow-200 text-yellow-800', icon: '🔥' },
  unrealistic: { bg: 'bg-orange-50 border-orange-200 text-orange-800', icon: '🎯' },
}

export default function DashboardClient({ plan, logs, userName, goal, baseline }: Props) {
  const [activeWeek, setActiveWeek] = useState(0)
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const week       = plan.weeks[activeWeek]
  const totalWeeks = plan.weeks.length

  // Progress stats
  const totalRuns = logs.length
  const avgPace   = logs.length > 0
    ? logs.reduce((s, l) => s + (l.pace_min_per_km ?? 0), 0) / logs.length
    : null
  const avgHr = logs.filter(l => l.avg_hr_bpm).length > 0
    ? logs.filter(l => l.avg_hr_bpm).reduce((s, l) => s + (l.avg_hr_bpm ?? 0), 0) /
      logs.filter(l => l.avg_hr_bpm).length
    : null

  const pbPace: number | null = baseline.pb_pace_min_per_km ?? null
  const pbHr:   number | null = baseline.pb_hr_bpm          ?? null

  // Feasibility
  const feasibility = plan.feasibility
  const bannerStyle = feasibility
    ? FEASIBILITY_BANNER[feasibility.status]
    : null

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">❤️</span>
            <span className="font-bold text-brand-700">PaceHeart</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/log" className="btn-primary text-sm py-2 px-4">+ Log Run</Link>
            <Link href="/onboarding" className="text-sm text-gray-500 hover:text-gray-700">Edit Profile</Link>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              {loggingOut ? 'Signing out...' : 'Log out'}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-1">Hey {userName}! 👋</h1>
          <p className="text-brand-100 text-sm">
            Training for a <strong className="text-white uppercase">{goal.distance}</strong> in{' '}
            <strong className="text-white">{goal.deadline_weeks} weeks</strong> · Target:{' '}
            <strong className="text-white">{formatPace(goal.target_pace_min_per_km)} min/km</strong>
            {goal.target_hr_bpm && (
              <> · HR goal: <strong className="text-white">{goal.target_hr_bpm} bpm</strong></>
            )}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="bg-white/20 rounded-xl px-4 py-2 inline-block text-sm">
              Level: <strong className="capitalize">{plan.level}</strong>
            </div>
            {pbPace && (
              <div className="bg-white/20 rounded-xl px-4 py-2 inline-flex items-center gap-2 text-sm">
                <span>⚡</span>
                <span>PB: <strong>{formatPace(pbPace)} /km</strong>
                  {pbHr && <span className="opacity-80"> · {pbHr} bpm</span>}
                </span>
              </div>
            )}
            {logs.length >= 1 && (
              <div className="bg-white/20 rounded-xl px-4 py-2 inline-block text-sm">
                ✅ Plan updated from your runs
              </div>
            )}
          </div>
        </div>

        {/* ── Coach Feasibility Banner ── */}
        {feasibility && bannerStyle && (
          <div className={`border rounded-2xl px-5 py-4 ${bannerStyle.bg}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">{bannerStyle.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm mb-1">Coach&apos;s Note</p>
                <p className="text-sm leading-relaxed">{feasibility.coachNote}</p>

                {/* Show milestone progress only when goal needs multiple blocks */}
                {(feasibility.status === 'unrealistic' || feasibility.status === 'ambitious') && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <div className="bg-white/60 rounded-lg px-3 py-1.5 text-xs font-medium">
                      🏁 This block target: <strong>{formatPace(feasibility.adjustedTargetPace)} /km</strong>
                    </div>
                    <div className="bg-white/60 rounded-lg px-3 py-1.5 text-xs font-medium">
                      🎯 Dream goal: <strong>{formatPace(feasibility.dreamTargetPace)} /km</strong>
                    </div>
                    <div className="bg-white/60 rounded-lg px-3 py-1.5 text-xs font-medium">
                      📅 Est. journey: <strong>~{feasibility.blocksNeeded * 8} weeks</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className={`grid gap-4 ${pbPace ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'}`}>
          {[
            { label: 'Runs Logged', value: totalRuns.toString(),                            icon: '🏃' },
            { label: 'Avg Pace',    value: avgPace ? formatPace(avgPace) : '--:--',         icon: '⏱️' },
            { label: 'Avg HR',      value: avgHr ? `${Math.round(avgHr)} bpm` : '-- bpm',  icon: '❤️' },
            { label: 'Weeks Left',  value: `${totalWeeks - activeWeek}`,                    icon: '📅' },
            ...(pbPace ? [{ label: 'Personal Best', value: `${formatPace(pbPace)} /km`, icon: '⚡' }] : []),
          ].map(s => (
            <div key={s.label} className="card text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Training Plan */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Training Plan</h2>
            <span className="text-sm text-gray-500">Week {activeWeek + 1} of {totalWeeks}</span>
          </div>

          {/* Week Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
            {plan.weeks.map((w, i) => (
              <button
                key={i}
                onClick={() => setActiveWeek(i)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  i === activeWeek ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                W{i + 1}
              </button>
            ))}
          </div>

          {/* Week Header */}
          <div className="bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 mb-4">
            <div className="font-semibold text-brand-700">{week.weekFocus}</div>
            <div className="text-sm text-brand-600">Total volume: {week.totalKm} km</div>
          </div>

          {/* Sessions */}
          <div className="space-y-3">
            {week.sessions.map((session, i) => (
              <div key={i} className={`border rounded-xl px-4 py-3 ${WORKOUT_COLORS[session.type]}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{WORKOUT_ICONS[session.type]}</span>
                    <span className="font-semibold capitalize">{session.type} Run</span>
                  </div>
                  <div className="text-sm font-medium">
                    {session.type !== 'rest' && (
                      <>{session.distanceKm} km · {formatPace(session.targetPaceMinPerKm)} /km</>
                    )}
                  </div>
                </div>

                {session.hrZone && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${HR_ZONE_COLORS[session.hrZone.zone]}`}>
                      ❤️ Zone {session.hrZone.zone} · {session.hrZone.minBpm}–{session.hrZone.maxBpm} bpm
                    </span>
                    <span className="text-xs opacity-60">{session.hrZone.description}</span>
                  </div>
                )}

                <p className="text-xs mt-1.5 opacity-75">{session.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Runs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Recent Runs</h2>
            <Link href="/log" className="text-sm text-brand-600 hover:underline font-medium">+ Log a run</Link>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <div className="text-4xl mb-3">🏃</div>
              <p className="font-medium">No runs logged yet</p>
              <p className="text-sm mt-1">Log your first run to start tracking progress!</p>
              <Link href="/log" className="btn-primary inline-block mt-4 text-sm py-2 px-6">Log First Run →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.slice(0, 5).map((log, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="font-medium text-sm">
                      {new Date(log.logged_at).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      })}
                    </div>
                    <div className="text-xs text-gray-500">{log.distance_km} km</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">{formatPace(log.pace_min_per_km)} /km</div>
                    {log.avg_hr_bpm && (
                      <div className="text-xs text-red-500">❤️ {log.avg_hr_bpm} bpm</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}