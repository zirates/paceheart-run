// src/lib/plan-engine/generate-plan.ts

import {
  RunnerLevel, WorkoutType, WorkoutSession,
  TrainingWeek, TrainingPlan, GoalConfig,
  FeasibilityReport, FeasibilityStatus,
} from './types'
import { buildSession } from './workout-builder'

// ── Feasibility engine ────────────────────────────────────────────────────────
// Improvement science: ~5–8% per 8-week block is realistic for most runners
const IMPROVEMENT_PER_BLOCK = 0.07  // 7% pace improvement per block

export function assessFeasibility(
  anchorPace:   number,   // PB pace (most reliable)
  targetPace:   number,   // dream goal
  deadlineWeeks: number,
): FeasibilityReport {
  const gapPercent = ((anchorPace - targetPace) / anchorPace) * 100
  const blocksNeeded = gapPercent <= 0
    ? 0
    : Math.ceil(Math.log(targetPace / anchorPace) / Math.log(1 - IMPROVEMENT_PER_BLOCK))

  // Realistic target for THIS block only (7% improvement)
  const adjustedTargetPace = anchorPace * (1 - IMPROVEMENT_PER_BLOCK)

  let status: FeasibilityStatus
  let coachNote: string

  if (gapPercent <= 0) {
    status    = 'on_track'
    coachNote = `You've already hit your target pace! 🎉 Your plan will push you beyond ${formatPaceNote(targetPace)} /km. Time to set a new goal.`
  } else if (gapPercent <= 10) {
    status    = 'reachable'
    coachNote = `Your ${formatPaceNote(targetPace)} /km goal is within reach this block. Your plan trains directly toward it. 💪`
  } else if (gapPercent <= 20) {
    status    = 'ambitious'
    coachNote = `Your ${formatPaceNote(targetPace)} /km goal is ambitious but possible. Your plan pushes hard — stay consistent and you'll get close. 🔥`
  } else {
    status    = 'unrealistic'
    coachNote = `Your ${formatPaceNote(targetPace)} /km goal needs ~${blocksNeeded} training blocks (~${blocksNeeded * 8} weeks). This plan targets ${formatPaceNote(adjustedTargetPace)} /km — your realistic milestone for now. You're on the right path. 🎯`
  }

  return {
    status,
    gapPercent:         Math.round(gapPercent * 10) / 10,
    adjustedTargetPace: Math.round(adjustedTargetPace * 100) / 100,
    blocksNeeded:       Math.max(blocksNeeded, 1),
    coachNote,
    dreamTargetPace:    targetPace,
  }
}

function formatPaceNote(pace: number): string {
  const mins = Math.floor(pace)
  const secs = Math.round((pace - mins) * 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ── Workout schedule builder ──────────────────────────────────────────────────
function getWorkoutTypes(runDays: number, phase: string): WorkoutType[] {
  const pools: Record<string, WorkoutType[]> = {
    'Base Building': ['easy', 'long', 'easy', 'easy', 'long',      'easy',     'easy'],
    'Development':   ['easy', 'tempo', 'long', 'easy', 'tempo',    'easy',     'long'],
    'Peak Training': ['easy', 'tempo', 'interval', 'long', 'easy', 'interval', 'tempo'],
    'Taper':         ['easy', 'long', 'easy', 'easy', 'long',      'easy',     'easy'],
  }
  const pool = pools[phase] ?? pools['Development']
  return pool.slice(0, runDays) as WorkoutType[]
}

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

function getPhase(week: number, total: number): string {
  const pct = week / total
  if (pct <= 0.30) return 'Base Building'
  if (pct <= 0.60) return 'Development'
  if (pct <= 0.85) return 'Peak Training'
  return 'Taper'
}

// ── Pace calculator — PB as primary anchor ────────────────────────────────────
function getPaceForWorkout(
  type:          WorkoutType,
  pbPace:        number,   // ← PRIMARY anchor (most reliable)
  currentPace:   number,   // ← used only for easy/long (reflects today's fitness)
  blockTarget:   number,   // adjusted target for this block (feasibility-aware)
  progressRatio: number,   // 0.0 → 1.0 across weeks
): number {
  switch (type) {
    case 'easy':
      // Easy: based on current fitness (logged pace), not PB
      // Keeps easy runs truly easy regardless of PB
      return currentPace * 1.15

    case 'long':
      // Long: even more conservative than easy
      return currentPace * 1.20

    case 'tempo':
      // Starts at PB pace (what you can do on a good day)
      // Converges toward block target by end of plan
      {
        const start = pbPace * 1.05           // slightly slower than PB at week 1
        const end   = blockTarget * 1.05      // 5% above block target at peak
        return start - (start - end) * progressRatio
      }

    case 'interval':
      // Starts at PB pace, converges to block target
      // Intervals should reach (and slightly exceed) block target at peak
      {
        const start = pbPace
        const end   = blockTarget * 0.98      // just under block target at peak
        return start - (start - end) * progressRatio
      }

    case 'rest':
    default:
      return 0
  }
}

// ── Main generator ────────────────────────────────────────────────────────────
export interface GeneratePlanInput {
  level:                RunnerLevel
  currentPaceMinPerKm:  number   // from recent logs (or onboarding fallback)
  currentAvgDistanceKm: number
  weeklyRunDays:        number
  rpe:                  number
  ageYears?:            number
  currentHrEasy?:       number
  distance:             GoalConfig['distance']
  targetPaceMinPerKm:   number   // dream goal
  deadlineWeeks:        number
  targetHrBpm?:         number
  pbPaceMinPerKm?:      number   // PB — primary anchor
  pbHrBpm?:             number
}

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
    ageYears,
  } = input

  // ── 1. Determine anchor pace ──────────────────────────────────────────────
  // Priority: PB > current pace (PB is more reliable than 1–2 logged runs)
  // If no PB, fall back to current pace
  const anchorPace = pbPaceMinPerKm ?? currentPaceMinPerKm

  // ── 2. Assess feasibility ─────────────────────────────────────────────────
  const feasibility = assessFeasibility(anchorPace, targetPaceMinPerKm, deadlineWeeks)

  // ── 3. Use adjusted target for THIS block's training paces ───────────────
  // If goal is unrealistic, train toward the adjusted (realistic) target
  // Dream goal is preserved in feasibility.dreamTargetPace
  const blockTarget = feasibility.status === 'unrealistic' || feasibility.status === 'ambitious'
    ? feasibility.adjustedTargetPace
    : targetPaceMinPerKm

  const clampedDays = Math.min(Math.max(weeklyRunDays, 1), 7)
  const weeks: TrainingWeek[] = []

  for (let week = 1; week <= deadlineWeeks; week++) {
    const progressRatio  = week / deadlineWeeks
    const phase          = getPhase(week, deadlineWeeks)
    const workoutTypes   = getWorkoutTypes(clampedDays, phase)
    const weeklySchedule = buildWeekSchedule(clampedDays, workoutTypes)

    const distanceScale  = phase === 'Taper' ? 0.75 : 0.8 + progressRatio * 0.6
    const scaledDistance = currentAvgDistanceKm * distanceScale

    const sessions: WorkoutSession[] = weeklySchedule.map((type) => {
      const pace = getPaceForWorkout(
        type,
        anchorPace,
        currentPaceMinPerKm,
        blockTarget,
        progressRatio,
      )
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
      targetPaceMinPerKm,   // always the dream goal
      deadlineWeeks,
      targetHrBpm,
    },
    feasibility,            // ← full report attached
    weeks,
  }
}