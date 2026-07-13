export type RunnerLevel = 'beginner' | 'intermediate' | 'advanced'

export type WorkoutType = 'easy' | 'tempo' | 'long' | 'interval' | 'rest'

export interface UserBaseline {
  level: RunnerLevel
  currentPaceMinPerKm: number
  currentAvgDistanceKm: number
  weeklyRunDays: number
  rpe: number
  ageYears?: number
  currentHrEasy?: number
  pbPaceMinPerKm?: number   // ← NEW: personal best pace
  pbHrBpm?: number          // ← NEW: HR during personal best
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