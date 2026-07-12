// Looks at the most recent log for an exercise and proposes next-session direction.
// entries: array of exercise_logs rows (each has .sets: [{weight,reps,rpe}], .target_reps, .date via joined session)
export function suggestNext(entries) {
  if (!entries || entries.length === 0) return null
  const sorted = [...entries].sort((a, b) => (a.sessionDate < b.sessionDate ? 1 : -1))
  const last = sorted[0]
  const sets = last.sets || []
  if (sets.length === 0) return null

  const avgRpe = sets.reduce((sum, s) => sum + (Number(s.rpe) || 0), 0) / sets.length
  const hitTarget = sets.every((s) => Number(s.reps) >= Number(last.target_reps || s.reps))

  if (avgRpe <= 7 && hitTarget) {
    const bump = sets[0].weight ? Math.max(2.5, Math.round(sets[0].weight * 0.05)) : 5
    return {
      tone: 'up',
      text: `Add ~${bump} lbs next session — RPE stayed at ${avgRpe.toFixed(1)}, target reps hit.`,
    }
  }
  if (avgRpe >= 9) {
    return {
      tone: 'hold',
      text: `Hold weight or reduce a set — RPE hit ${avgRpe.toFixed(1)}, close to failure.`,
    }
  }
  if (!hitTarget) {
    return {
      tone: 'hold',
      text: `Repeat this weight — reps came up short of target last time.`,
    }
  }
  return {
    tone: 'hold',
    text: `Repeat this weight, aim for smoother reps across all sets.`,
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
