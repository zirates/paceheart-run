import type { WorkoutSession, WorkoutType } from './types'

export function buildSession(
  type: WorkoutType,
  baseDistanceKm: number,
  basePaceMinPerKm: number
): WorkoutSession {
  const paceMap: Record<WorkoutType, number> = {
    easy:     basePaceMinPerKm * 1.15,
    long:     basePaceMinPerKm * 1.20,
    tempo:    basePaceMinPerKm * 0.92,
    interval: basePaceMinPerKm * 0.85,
    rest:     0,
  }

  const distMap: Record<WorkoutType, number> = {
    easy:     baseDistanceKm,
    long:     baseDistanceKm * 1.5,
    tempo:    baseDistanceKm * 0.8,
    interval: baseDistanceKm * 0.7,
    rest:     0,
  }

  const descMap: Record<WorkoutType, string> = {
    easy:     'Comfortable conversational pace. You should be able to speak full sentences.',
    long:     'Slow and steady. Build endurance. Do not worry about pace.',
    tempo:    'Comfortably hard. Sustainable but challenging for 20–40 min.',
    interval: 'Hard effort repeats with recovery jogs in between.',
    rest:     'Full rest or light stretching. Recovery is part of training.',
  }

  return {
    type,
    distanceKm: Math.round(distMap[type] * 10) / 10,
    targetPaceMinPerKm: Math.round(paceMap[type] * 100) / 100,
    description: descMap[type],
  }
}
