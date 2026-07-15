export type RunnerLevel = 'beginner' | 'intermediate' | 'advanced'

export type WorkoutType = 'easy' | 'tempo' | 'long' | 'interval' | 'rest'

// ─── HR Zone ─────────────────────────────────────────────────────────────────
export interface HrZone {
  zone: number          // 1–5
  name: string          // e.g. "Aerobic Base"
  minBpm: number
  maxBpm: number
  description: string   // e.g. "Fat Burn / Aerobic Base"
}

export interface UserBaseline {
  level: RunnerLevel
  currentPaceMinPerKm: number
  currentAvgDistanceKm: number
  weeklyRunDays: number
  rpe: number
  ageYears?: number
  currentHrEasy?: number
  pbPaceMinPerKm?: number
  pbHrBpm?: number
}

export interface GoalConfig {
  distance: '5k' | '10k' | 'half' | 'marathon'
  targetPaceMinPerKm: number
  deadlineWeeks: number
  targetHrBpm?: number
}

export interface WorkoutSession {
  type: WorkoutType
  distanceKm: number
  targetPaceMinPerKm: number
  description: string
  hrZone?: HrZone        // ← NEW optional, won't break existing UI
}

export interface TrainingWeek {
  weekNumber: number
  weekFocus: string
  totalKm: number
  sessions: WorkoutSession[]
}

export interface TrainingPlan {
  level: RunnerLevel
  goal: GoalConfig
  weeks: TrainingWeek[]
}