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
  pbPaceMinPerKm?: number
  pbHrBpm?: number
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
function getPaceForWorkout(
  type: WorkoutType,
  currentPace: number,
  targetPace: number,
  progressRatio: number,
  pbPace?: number,
): number {
  switch (type) {
    case 'easy':
      return currentPace * 1.15

    case 'long':
      return currentPace * 1.20

    case 'tempo':
      if (pbPace) {
        const tempoBase = (currentPace + pbPace) / 2
        return tempoBase - (tempoBase - pbPace) * progressRatio * 0.5
      }
      return currentPace * 0.92

    case 'interval':
      if (pbPace) {
        return pbPace * 1.02
      }
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
    pbPaceMinPerKm,
    ageYears,          // ✅ NEW: now extracted and passed to buildSession
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
      const pace = getPaceForWorkout(
        type,
        currentPaceMinPerKm,
        targetPaceMinPerKm,
        progressRatio,
        pbPaceMinPerKm,
      )
      // ✅ FIXED: pass ageYears & targetHrBpm so buildSession can
      //    compute HR zones and adaptive descriptions correctly
      return buildSession(type, scaledDistance, pace, ageYears, targetHrBpm)
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