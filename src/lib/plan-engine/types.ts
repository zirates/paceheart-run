// src/lib/plan-engine/types.ts

export type RunnerLevel   = 'beginner' | 'intermediate' | 'advanced'
export type WorkoutType   = 'easy' | 'tempo' | 'long' | 'interval' | 'rest'
export type GoalDistance  = '5K' | '10K' | 'half-marathon' | 'marathon'

export interface GoalConfig {
  distance:             GoalDistance | string
  targetPaceMinPerKm:   number   // user's dream pace
  deadlineWeeks:        number
  targetHrBpm?:         number
}

// ── HR Zone ──────────────────────────────────────────────────────────────────
export interface HrZone {
  zone:        number   // 1–5
  minBpm:      number
  maxBpm:      number
  description: string   // "Fat Burn / Aerobic Base" etc.
}

// ── Single session ────────────────────────────────────────────────────────────
export interface WorkoutSession {
  type:                WorkoutType
  distanceKm:          number
  targetPaceMinPerKm:  number
  description:         string
  hrZone?:             HrZone
}

// ── Week ─────────────────────────────────────────────────────────────────────
export interface TrainingWeek {
  weekNumber: number
  weekFocus:  string
  sessions:   WorkoutSession[]
  totalKm:    number
}

// ── Feasibility ──────────────────────────────────────────────────────────────
export type FeasibilityStatus =
  | 'on_track'       // gap ≤ 0%  — already at or past target
  | 'reachable'      // gap ≤ 10% — achievable this block
  | 'ambitious'      // gap ≤ 20% — hard but possible
  | 'unrealistic'    // gap > 20% — needs multi-block journey

export interface FeasibilityReport {
  status:              FeasibilityStatus
  gapPercent:          number    // e.g. 27
  adjustedTargetPace:  number    // realistic pace for THIS block
  blocksNeeded:        number    // total 8-week blocks to reach dream goal
  coachNote:           string    // human-readable message
  dreamTargetPace:     number    // original user goal — never lost
}

// ── Full plan ─────────────────────────────────────────────────────────────────
export interface TrainingPlan {
  level:       RunnerLevel
  goal:        GoalConfig
  feasibility: FeasibilityReport   // ← NEW
  weeks:       TrainingWeek[]
}