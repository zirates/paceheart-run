// src/lib/plan-engine/regenerate-plan.ts
// Called after every run log to regenerate the plan using latest pace data.

import { createClient } from '@/lib/supabase/client'
import { generatePlan } from './generate-plan'
import { deriveRunnerLevel } from './derive-level'

export async function regeneratePlanAfterLog(userId: string): Promise<void> {
  const supabase = createClient()

  // ── 1. Fetch last 3 runs with a valid pace ──────────────────────────────
  const { data: recentRuns, error: runErr } = await supabase
    .from('run_logs')
    .select('pace_min_per_km')
    .eq('user_id', userId)
    .not('pace_min_per_km', 'is', null)
    .order('logged_at', { ascending: false })
    .limit(3)

  if (runErr || !recentRuns || recentRuns.length === 0) {
    // No runs yet — nothing to regenerate
    return
  }

  // ── 2. Calculate average pace from last 3 runs ──────────────────────────
  const avgPace =
    recentRuns.reduce((sum, r) => sum + Number(r.pace_min_per_km), 0) /
    recentRuns.length

  // ── 3. Fetch baseline + goal ────────────────────────────────────────────
  const [{ data: baseline }, { data: goal }] = await Promise.all([
    supabase
      .from('user_baselines')
      .select('*')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .single(),
  ])

  if (!baseline || !goal) return

  // ── 4. Re-derive level using updated pace ───────────────────────────────
  const updatedLevel = deriveRunnerLevel(
    avgPace,
    baseline.weekly_run_days,
    baseline.rpe,
    baseline.current_avg_distance_km
  )

  // ── 5. Regenerate plan using latest avg pace + personal best ────────────
  const newPlan = generatePlan({
    level:                updatedLevel,
    currentPaceMinPerKm:  avgPace,           // ← uses real logged pace
    currentAvgDistanceKm: baseline.current_avg_distance_km,
    weeklyRunDays:        baseline.weekly_run_days,
    rpe:                  baseline.rpe,
    ageYears:             baseline.age_years        ?? undefined,
    currentHrEasy:        baseline.current_hr_easy  ?? undefined,
    distance:             goal.distance,
    targetPaceMinPerKm:   goal.target_pace_min_per_km,
    deadlineWeeks:        goal.deadline_weeks,
    targetHrBpm:          goal.target_hr_bpm        ?? undefined,
    pbPaceMinPerKm:       baseline.pb_pace_min_per_km ?? undefined,  // ← NEW
    pbHrBpm:              baseline.pb_hr_bpm          ?? undefined,  // ← NEW
  })

  // ── 6. Save updated plan to Supabase ────────────────────────────────────
  await supabase
    .from('training_plans')
    .upsert(
      {
        user_id:    userId,
        plan_data:  newPlan,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
}