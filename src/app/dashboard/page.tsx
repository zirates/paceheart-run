import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { generatePlan } from '@/lib/plan-engine/generate-plan'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch baseline
  const { data: baseline } = await supabase
    .from('user_baselines')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!baseline) redirect('/onboarding')

  // Fetch goal
  const { data: goal } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .single()

  if (!goal) redirect('/onboarding')

  // Fetch run logs
  const { data: logs } = await supabase
    .from('run_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('logged_at', { ascending: false })
    .limit(20)

  // ── Try to load saved plan from Supabase first ──────────────────────────
  const { data: savedPlan } = await supabase
    .from('training_plans')
    .select('plan_data')
    .eq('user_id', user.id)
    .single()

  // ── Fall back to generating a fresh plan if none saved yet ─────────────
  const plan = savedPlan?.plan_data ?? generatePlan({
    level:                baseline.derived_level,
    weeklyRunDays:        baseline.weekly_run_days,
    currentPaceMinPerKm:  baseline.current_pace_min_per_km,
    currentAvgDistanceKm: baseline.current_avg_distance_km,
    rpe:                  baseline.rpe,
    ageYears:             baseline.age_years         ?? undefined,
    currentHrEasy:        baseline.current_hr_easy   ?? undefined,
    distance:             goal.distance,
    targetPaceMinPerKm:   goal.target_pace_min_per_km,
    deadlineWeeks:        goal.deadline_weeks,
    targetHrBpm:          goal.target_hr_bpm         ?? undefined,
    pbPaceMinPerKm:       baseline.pb_pace_min_per_km ?? undefined,  // ← NEW
    pbHrBpm:              baseline.pb_hr_bpm          ?? undefined,  // ← NEW
  })

  const userName = user.user_metadata?.full_name?.split(' ')[0] ?? 'Runner'

  return (
    <DashboardClient
      plan={plan}
      logs={logs ?? []}
      userName={userName}
      goal={goal}
      baseline={baseline}
    />
  )
}