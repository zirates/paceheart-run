import type { WorkoutSession, WorkoutType, HrZone } from './types'

// ─── HR Zone Calculator ───────────────────────────────────────────────────────
// Calculates personalized HR zones based on max HR (220 - age)
// Falls back to 35 years old if age is not provided
function calcMaxHr(ageYears?: number): number {
  return 220 - (ageYears ?? 35)
}

function getHrZone(type: WorkoutType, ageYears?: number, targetHrBpm?: number): HrZone | undefined {
  if (type === 'rest') return undefined

  const maxHr = calcMaxHr(ageYears)

  const zones: Record<Exclude<WorkoutType, 'rest'>, HrZone> = {
    easy: {
      zone: 2,
      name: 'Aerobic Base',
      minBpm: Math.round(maxHr * 0.60),
      maxBpm: Math.round(maxHr * 0.70),
      description: 'Fat Burn / Aerobic Base',
    },
    long: {
      zone: 2,
      name: 'Aerobic Base',
      minBpm: Math.round(maxHr * 0.60),
      maxBpm: Math.round(maxHr * 0.70),
      description: 'Fat Burn / Aerobic Base',
    },
    tempo: {
      zone: 3,
      name: 'Tempo',
      minBpm: Math.round(maxHr * 0.70),
      maxBpm: Math.round(maxHr * 0.80),
      description: 'Aerobic Endurance',
    },
    interval: {
      zone: 4,
      name: 'Threshold',
      minBpm: Math.round(maxHr * 0.80),
      maxBpm: Math.round(maxHr * 0.90),
      description: 'Lactate Threshold / Speed',
    },
  }

  // If user has a targetHrBpm, cap easy/long zone max to their goal HR
  const zone = zones[type as Exclude<WorkoutType, 'rest'>]
  if (targetHrBpm && (type === 'easy' || type === 'long')) {
    return { ...zone, maxBpm: Math.min(zone.maxBpm, targetHrBpm) }
  }

  return zone
}

// ─── Adaptive Description ─────────────────────────────────────────────────────
// Description adapts based on the actual calculated pace
// so users at walking pace get honest, encouraging context
function getDescription(type: WorkoutType, paceMinPerKm: number): string {
  if (type === 'rest') {
    return 'Full rest or light stretching. Recovery is part of training.'
  }

  const isWalkPace = paceMinPerKm >= 12.0
  const isShuffle  = paceMinPerKm >= 9.5 && paceMinPerKm < 12.0

  switch (type) {
    case 'easy':
      if (isWalkPace) {
        return 'At your current fitness level, this easy effort will feel like a brisk walk — and that\'s completely fine. Focus on staying in Zone 2, not the speed.'
      }
      if (isShuffle) {
        return 'Very easy jog. Keep the effort low — you should be able to hold a full conversation without gasping.'
      }
      return 'Comfortable conversational pace. You should be able to speak full sentences.'

    case 'long':
      if (isWalkPace) {
        return 'A longer brisk walk to build your aerobic base. Time on feet matters more than speed here. Stay relaxed and enjoy it.'
      }
      if (isShuffle) {
        return 'Slow and steady jog. Build endurance, not speed. If you need to walk, walk — just keep moving.'
      }
      return 'Slow and steady. Build endurance. Do not worry about pace.'

    case 'tempo':
      return 'Comfortably hard. Sustainable but challenging for 20–40 min. You can speak a few words, not full sentences.'

    case 'interval':
      return 'Hard effort repeats with recovery jogs in between. Push hard, then recover fully before the next rep.'

    default:
      return ''
  }
}

// ─── Main Builder ─────────────────────────────────────────────────────────────
// NOTE: basePaceMinPerKm is now the FINAL calculated pace from generate-plan.ts
// We no longer multiply here — that was causing the double-multiply bug
export function buildSession(
  type: WorkoutType,
  baseDistanceKm: number,
  basePaceMinPerKm: number,
  ageYears?: number,
  targetHrBpm?: number,
): WorkoutSession {

  // ✅ FIXED: No more pace multiplier here — pace comes pre-calculated from generate-plan.ts
  const distMap: Record<WorkoutType, number> = {
    easy:     baseDistanceKm,
    long:     baseDistanceKm * 1.5,
    tempo:    baseDistanceKm * 0.8,
    interval: baseDistanceKm * 0.7,
    rest:     0,
  }

  const finalPace = type === 'rest' ? 0 : basePaceMinPerKm
  const finalDist = Math.round(distMap[type] * 10) / 10

  return {
    type,
    distanceKm:         finalDist,
    targetPaceMinPerKm: Math.round(finalPace * 100) / 100,
    description:        getDescription(type, finalPace),
    hrZone:             getHrZone(type, ageYears, targetHrBpm),
  }
}