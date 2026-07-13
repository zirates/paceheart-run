import type { RunnerLevel } from './types'

export function deriveRunnerLevel(
  paceMinPerKm: number,
  weeklyDays: number,
  rpe: number,
  avgDistanceKm: number
): RunnerLevel {
  let score = 0

  // Pace scoring (lower = faster = better)
  if (paceMinPerKm < 5.0) score += 3
  else if (paceMinPerKm < 6.0) score += 2
  else if (paceMinPerKm < 7.0) score += 1

  // Weekly days scoring
  if (weeklyDays >= 5) score += 3
  else if (weeklyDays >= 3) score += 2
  else if (weeklyDays >= 2) score += 1

  // RPE scoring (lower RPE at same pace = fitter)
  if (rpe <= 4) score += 3
  else if (rpe <= 6) score += 2
  else if (rpe <= 7) score += 1

  // Distance scoring
  if (avgDistanceKm >= 10) score += 3
  else if (avgDistanceKm >= 6) score += 2
  else if (avgDistanceKm >= 3) score += 1

  if (score >= 9) return 'advanced'
  if (score >= 5) return 'intermediate'
  return 'beginner'
}
