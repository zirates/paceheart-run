// src/lib/plan-engine/workout-builder.ts

import { WorkoutType, WorkoutSession, HrZone } from './types'

// ── HR Zone calculator ────────────────────────────────────────────────────────
export function getHrZone(
  type:         WorkoutType,
  ageYears:     number = 35,
  targetHrBpm?: number,
): HrZone | undefined {
  if (type === 'rest') return undefined

  const maxHr = 220 - ageYears

  const ZONES: Record<number, { min: number; max: number; description: string }> = {
    1: { min: 0.50, max: 0.60, description: 'Active Recovery' },
    2: { min: 0.60, max: 0.70, description: 'Fat Burn / Aerobic Base' },
    3: { min: 0.70, max: 0.80, description: 'Aerobic Endurance' },
    4: { min: 0.80, max: 0.90, description: 'Lactate Threshold' },
    5: { min: 0.90, max: 1.00, description: 'VO2 Max / Race Effort' },
  }

  const zoneMap: Record<WorkoutType, number> = {
    easy:     2,
    long:     2,
    tempo:    3,
    interval: 4,
    rest:     1,
  }

  const zoneNum = zoneMap[type]
  const z       = ZONES[zoneNum]
  let minBpm    = Math.round(maxHr * z.min)
  let maxBpm    = Math.round(maxHr * z.max)

  // Cap easy/long runs at targetHrBpm if provided (e.g. "stay under 130")
  if (targetHrBpm && (type === 'easy' || type === 'long')) {
    maxBpm = Math.min(maxBpm, targetHrBpm)
    minBpm = Math.min(minBpm, maxBpm - 5)
  }

  return { zone: zoneNum, minBpm, maxBpm, description: z.description }
}

// ── HR-based description ──────────────────────────────────────────────────────
// Descriptions are driven by HR zone — NOT pace thresholds
function getDescription(
  type:      WorkoutType,
  hrZone?:   HrZone,
  distanceKm?: number,
): string {
  if (type === 'rest') {
    return 'Full rest or light stretching. Recovery is part of training.'
  }

  const zone = hrZone?.zone ?? 2

  switch (type) {
    case 'easy':
      if (zone <= 2) return 'Comfortable, conversational pace — you can speak full sentences without gasping. This is your aerobic base builder.'
      if (zone === 3) return 'Moderate effort. You can speak a few words between breaths. Slightly faster than your true easy pace — focus on keeping HR in Zone 2.'
      return 'Effort feels hard for an easy run — slow down until you can hold a full conversation.'

    case 'long':
      if (zone <= 2) return `Long effort at conversational pace. Time on feet matters more than speed. Stay relaxed — if you can\'t speak comfortably, slow down.`
      return 'Slow down to keep this truly aerobic. Long runs build endurance through duration, not intensity.'

    case 'tempo':
      if (zone === 3) return 'Comfortably hard. Sustainable but challenging for 20–40 min. You can speak a few words, not full sentences.'
      if (zone === 4) return 'Hard, controlled effort at lactate threshold. Breathing is heavy — single words only. Hold this for 15–25 min max.'
      return 'Push the pace — this is your race-effort work. Short reps with full recovery between.'

    case 'interval':
      if (zone === 4) return 'Hard repeats near your lactate threshold. Run fast, recover fully between reps. Quality over quantity.'
      return 'Maximum effort intervals. Short, sharp, and fast. Full recovery between each rep — you should feel ready to go again.'

    default:
      return 'Follow your training plan for this session.'
  }
}

// ── Session builder ───────────────────────────────────────────────────────────
export function buildSession(
  type:          WorkoutType,
  baseDistanceKm: number,
  targetPace:    number,
  ageYears?:     number,
  targetHrBpm?:  number,
): WorkoutSession {
  const distanceMultipliers: Record<WorkoutType, number> = {
    easy:     0.8,
    tempo:    0.6,
    long:     1.5,
    interval: 0.5,
    rest:     0,
  }

  const rawDist  = baseDistanceKm * distanceMultipliers[type]
  const distanceKm = Math.round(rawDist * 10) / 10
  const hrZone   = getHrZone(type, ageYears, targetHrBpm)
  const description = getDescription(type, hrZone, distanceKm)

  return {
    type,
    distanceKm,
    targetPaceMinPerKm: type === 'rest' ? 0 : Math.round(targetPace * 100) / 100,
    description,
    hrZone,
  }
}