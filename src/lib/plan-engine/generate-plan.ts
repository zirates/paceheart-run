// src/lib/plan-engine/generate-plan.ts

import {
  RunnerLevel,
  WorkoutType,
  WorkoutSession,
  TrainingWeek,
  TrainingPlan,
  GoalConfig,
} from './types'
import { buildSession } from './workout-builder'

// ─── Input shape ─────────────────────────────────────────────────────────────
interface GeneratePlanInput {
  level: RunnerLevel
  currentPaceMinPerKm: number
  currentAvgDistanceKm: number
  weeklyRunDays: number
  rpe: number
  ageYears?: number
  currentHrEasy?: number
  distance: GoalConfig['distance']
  targetPaceMinPerKm: number
  deadlineWeeks: number
  targetHrBpm?: number
  pbPaceMinPerKm?: number   // ← NEW: personal best pace
  pbHrBpm?: number          // ← NEW: HR during personal best (reserved for future HR zones)
}

// ─── Phase-aware workout type selector ───────────────────────────────────────
function getWorkoutTypes(runDays: number, phase: string): WorkoutType[] {
  const pools: Record<string, WorkoutType[]> = {
    'Base Building': ['easy', 'long', 'easy', 'easy', 'long',     'easy',     'easy'],
    'Development':   ['easy', 'tempo', 'long', 'easy', 'tempo',   'easy',     'long'],
    'Peak Training': ['easy', 'tempo', 'interval', 'long', 'easy','interval', 'tempo'],
    'Taper':         ['easy', 'long', 'easy', 'easy', 'long',     'easy',     'easy'],
  }
  const pool = pools[phase] ?? pools['Development']
  return pool.slice(0, runDays) as WorkoutType[]
}

// ─── Spread run days evenly across the 7-day week ────────────────────────────
function buildWeekSchedule(runDays: number, workoutTypes: WorkoutType[]): WorkoutType[] {
  const schedule: WorkoutType[] = Array(7).fill('rest')
  const spacing = Math.floor(7 / runDays)
  let dayIndex = 0

  for (let i = 0; i < runDays; i++) {
    schedule[dayIndex] = workoutTypes[i]
    dayIndex += spacing
    if (dayIndex >= 7) dayIndex = 6
  }

  return schedule
}

// ─── Phase label ─────────────────────────────────────────────────────────────
function getPhase(week: number, total: number): string {
  const pct = week / total
  if (pct <= 0.3)  return 'Base Building'
  if (pct <= 0.6)  return 'Development'
  if (pct <= 0.85) return 'Peak Training'
  return 'Taper'
}

// ─── Pace targets per workout type ───────────────────────────────────────────
// Returns the correct target pace for each session type.
// If pbPaceMinPerKm is available, interval & tempo targets are anchored to it.
// Otherwise we fall back to current-pace-based estimates.
function getPaceForWorkout(
  type: WorkoutType,
  currentPace: number,
  targetPace: number,
  progressRatio: number,
  pbPace?: number,
): number {
  switch (type) {
    case 'easy':
      // Easy runs: always slower than current pace (conversational effort)
      return currentPace * 1.15

    case 'long':
      // Long runs: even slower — endurance, not speed
      return currentPace * 1.20

    case 'tempo':
      // Tempo: comfortably hard — midpoint between current & PB (or target)
      // Progressively gets faster as the plan advances
      if (pbPace) {
        const tempoBase = (currentPace + pbPace) / 2
        // Shift tempo target toward PB over the course of the plan
        return tempoBase - (tempoBase - pbPace) * progressRatio * 0.5
      }
      // Fallback: 92% of current pace (slightly faster than easy)
      return currentPace * 0.92

    case 'interval':
      // Intervals: hardest effort — just above PB pace
      if (pbPace) {
        return pbPace * 1.02
      }
      // Fallback: 88% of current pace
      return currentPace * 0.88

    case 'rest':
    default:
      return 0
  }
}

// ─── Main generator ──────────────────────────────────────────────────────────
export function generatePlan(input: GeneratePlanInput): TrainingPlan {
  const {
    level,
    currentPaceMinPerKm,
    currentAvgDistanceKm,
    weeklyRunDays,
    distance,
    targetPaceMinPerKm,
    deadlineWeeks,
    targetHrBpm,
    pbPaceMinPerKm,   // ← NEW
  } = input

  const clampedDays = Math.min(Math.max(weeklyRunDays, 1), 7)
  const weeks: TrainingWeek[] = []

  for (let week = 1; week <= deadlineWeeks; week++) {
    const progressRatio = week / deadlineWeeks
    const phase = getPhase(week, deadlineWeeks)
    const workoutTypes = getWorkoutTypes(clampedDays, phase)
    const weeklySchedule = buildWeekSchedule(clampedDays, workoutTypes)

    // Scale distance progressively: starts at 80%, peaks at 140%, tapers at end
    const distanceScale = phase === 'Taper' ? 0.75 : 0.8 + progressRatio * 0.6
    const scaledDistance = currentAvgDistanceKm * distanceScale

    const sessions: WorkoutSession[] = weeklySchedule.map((type) => {
      // ← NEW: each workout type now gets its own pace target
      const pace = getPaceForWorkout(
        type,
        currentPaceMinPerKm,
        targetPaceMinPerKm,
        progressRatio,
        pbPaceMinPerKm,
      )
      return buildSession(type, scaledDistance, pace)
    })

    const totalVolume = sessions.reduce((sum, s) => sum + (s.distanceKm ?? 0), 0)

    weeks.push({
      weekNumber: week,
      weekFocus:  phase,
      sessions,
      totalKm:    Math.round(totalVolume * 10) / 10,
    })
  }

  return {
    level,
    goal: {
      distance,
      targetPaceMinPerKm,
      deadlineWeeks,
      targetHrBpm,
    },
    weeks,
  }
}