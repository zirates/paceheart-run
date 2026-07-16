// src/lib/plan-engine/hr-feedback.ts

import { WorkoutType, HrZone } from './types'

export type HrFeedbackStatus =
  | 'ok'
  | 'good_sign'
  | 'mild_warning'
  | 'warning'

export interface HrFeedback {
  status:  HrFeedbackStatus
  message: string
}

export interface RunLogInput {
  workoutType:          WorkoutType
  loggedHr:             number
  loggedPaceMinPerKm:   number
  targetPaceMinPerKm:   number
  hrZone:               HrZone    // pulled directly from the session's hrZone
  maxHr?:               number    // 220 - age, or user-provided
  recoveryHrAfterRest?: number    // optional: HR during rest between interval reps
}

const PACE_TOLERANCE_MIN_PER_KM = 0.15 // ~9 sec/km

/**
 * Evaluates logged HR against the session's target zone,
 * with tolerance that varies by workout type.
 *
 * - Easy/Long: strict Zone 2 discipline (recovery matters most)
 * - Tempo: lenient — drifting into low Zone 4 is normal/expected
 * - Interval: high work HR is EXPECTED — checks recovery HR instead
 */
export function evaluateHrFeedback(input: RunLogInput): HrFeedback {
  const {
    workoutType,
    loggedHr,
    loggedPaceMinPerKm,
    targetPaceMinPerKm,
    hrZone,
    maxHr,
    recoveryHrAfterRest,
  } = input

  const { minBpm, maxBpm } = hrZone

  const paceHit =
    Math.abs(loggedPaceMinPerKm - targetPaceMinPerKm) <= PACE_TOLERANCE_MIN_PER_KM

  switch (workoutType) {
    case 'easy':
    case 'long': {
      const ceiling = maxBpm + 5

      if (loggedHr > ceiling) {
        return {
          status: 'warning',
          message:
            'Your HR drifted above Zone 2 during this recovery-focused run. ' +
            'Slow down 10–15 sec/km next time to protect your recovery.',
        }
      }

      if (loggedHr < minBpm - 5 && paceHit) {
        return {
          status: 'good_sign',
          message:
            'Great sign — your fitness is improving! Same pace, lower HR. ' +
            'Your plan will adjust pace targets soon.',
        }
      }

      return { status: 'ok', message: 'Nice work — right in your aerobic zone.' }
    }

    case 'tempo': {
      const softCeiling = maxBpm + 15  // allow drift into low Zone 4
      const hardCeiling = maxBpm + 30  // deep Zone 4/5 — too aggressive

      if (loggedHr > hardCeiling) {
        return {
          status: 'warning',
          message:
            'This drifted into very high intensity — beyond typical tempo effort. ' +
            'Consider easing pace 10–15 sec/km next time.',
        }
      }

      if (loggedHr > maxBpm && loggedHr <= softCeiling) {
        return {
          status: 'ok',
          message:
            "This drifted into low Zone 4 — that's normal for threshold-building " +
            'tempo work. No action needed.',
        }
      }

      if (loggedHr < minBpm - 5 && paceHit) {
        return {
          status: 'good_sign',
          message:
            'Your fitness is improving! You hit tempo pace with lower effort ' +
            'than expected — your plan will push the pace soon.',
        }
      }

      return { status: 'ok', message: 'Solid tempo effort — right on target.' }
    }

    case 'interval': {
      if (recoveryHrAfterRest && recoveryHrAfterRest > maxBpm) {
        return {
          status: 'mild_warning',
          message:
            "Your HR isn't dropping enough during rest periods. " +
            'Try extending recovery time or shortening rep distance.',
        }
      }

      if (maxHr && loggedHr > maxHr * 1.02) {
        return {
          status: 'mild_warning',
          message:
            'HR reading seems unusually high — double check your ' +
            'heart rate monitor connection.',
        }
      }

      return {
        status: 'ok',
        message:
          'Strong interval effort — high HR here is exactly the point. ' +
          'Great VO2max stimulus.',
      }
    }

    default:
      return { status: 'ok', message: '' }
  }
}

/**
 * Weekly load check — call across the week's logged sessions
 * to catch overtraining risk from too many high-intensity sessions.
 */
export function evaluateWeeklyIntensityLoad(
  workoutTypesThisWeek: WorkoutType[],
): HrFeedback | null {
  const highIntensityCount = workoutTypesThisWeek.filter(
    (t) => t === 'interval' || t === 'tempo',
  ).length

  if (highIntensityCount >= 3) {
    return {
      status: 'warning',
      message:
        `You've logged ${highIntensityCount} high-intensity sessions this week. ` +
        'Consider adding an extra easy day — recovery is where adaptation happens.',
    }
  }

  return null
}