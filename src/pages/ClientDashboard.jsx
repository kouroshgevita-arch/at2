import { useState, useEffect } from 'react'
import { Plus, X, LogOut, Loader2, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { suggestNext, uid, todayISO } from '../lib/suggestionEngine'

export default function ClientDashboard({ profile }) {
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('workouts')
  const [inviteCode, setInviteCode] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState('')

  useEffect(() => {
    loadClient()
  }, [])

  const loadClient = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('client_auth_id', profile.id)
      .single()
    if (!error) setClient(data)
    setLoading(false)
  }

  const handleClaim = async (e) => {
    e.preventDefault()
    setClaimError('')
    if (!inviteCode.trim()) return
    setClaiming(true)
    const { error } = await supabase.rpc('claim_client_invite', { invite_code: inviteCode.trim() })
    if (error) {
      setClaimError("That code didn't work — double check it with your coach, or ask them to resend it.")
      setClaiming(false)
      return
    }
    await loadClient()
    setClaiming(false)
  }

  if (loading) {
    return (
      <div className="center-screen">
        <div className="loading-row"><Loader2 className="spin" size={18} /> <span>loading…</span></div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="center-screen">
        <div className="card" style={{ width: '100%', maxWidth: 380 }}>
          <div className="display-heading" style={{ fontSize: 20, marginBottom: 8 }}>ONE MORE STEP</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
            Enter the invite code your coach gave you to link your account.
          </div>
          <form onSubmit={handleClaim}>
            <input
              className="input"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Invite code"
              style={{ marginBottom: 12 }}
            />
            {claimError && <div style={{ color: 'var(--clay)', fontSize: 13, marginBottom: 12 }}>{claimError}</div>}
            <button type="submit" disabled={claiming || !inviteCode.trim()} className="btn btn-primary" style={{ width: '100%' }}>
              {claiming ? <Loader2 className="spin" size={16} /> : 'Link My Account'}
            </button>
          </form>
          <button onClick={() => supabase.auth.signOut()} className="btn btn-ghost" style={{ width: '100%', marginTop: 12 }}>
            Log Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#B8935B', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 4 }}>
            Welcome back
          </div>
          <div className="display-heading" style={{ fontSize: 28 }}>{client.name.toUpperCase()}</div>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="btn btn-ghost">
          <LogOut size={14} /> Log Out
        </button>
      </div>
      <div className="badge" style={{ color: 'var(--text-dim)', marginBottom: 24 }}>
        {client.session_count || 0} session{(client.session_count || 0) !== 1 ? 's' : ''} logged
      </div>

      <div className="tabs">
        {[
          { id: 'workouts', label: 'My Workouts' },
          { id: 'log', label: 'Log Session' },
          { id: 'progress', label: 'My Progress' },
        ].map((t) => (
          <button key={t.id} onClick={() => setView(t.id)} className={`tab ${view === t.id ? 'active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {view === 'workouts' && <MyWorkouts clientId={client.id} />}
      {view === 'log' && <LogMySession client={client} onClientUpdate={setClient} />}
      {view === 'progress' && <MyProgress clientId={client.id} />}
    </div>
  )
}

// ---------- My Workouts (assigned by coach) ----------
function MyWorkouts({ clientId }) {
  const [assigned, setAssigned] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('assigned_workouts')
      .select('*')
      .eq('client_id', clientId)
      .eq('active', true)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setAssigned(data)
        setLoading(false)
      })
  }, [clientId])

  if (loading) return <div className="loading-row"><Loader2 className="spin" size={16} /> <span>loading…</span></div>

  if (assigned.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: 32, textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 8 }}>
        Your coach hasn't assigned any exercises yet.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {assigned.map((a) => (
        <div key={a.id} className="card">
          <div style={{ fontWeight: 600, fontSize: 15 }}>{a.exercise}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            {a.target_sets || '—'} sets × {a.target_reps || '—'} reps
          </div>
          {a.notes && <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 8 }}>{a.notes}</div>}
        </div>
      ))}
    </div>
  )
}

// ---------- Log My Session ----------
function LogMySession({ client, onClientUpdate }) {
  const [date, setDate] = useState(todayISO())
  const [exercise, setExercise] = useState('')
  const [targetReps, setTargetReps] = useState('')
  const [sets, setSets] = useState([{ weight: '', reps: '', rpe: '' }])
  const [notes, setNotes] = useState('')
  const [sessionExercises, setSessionExercises] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    supabase
      .from('assigned_workouts')
      .select('exercise')
      .eq('client_id', client.id)
      .eq('active', true)
      .then(({ data }) => {
        if (data) setSuggestions([...new Set(data.map((d) => d.exercise))])
      })
  }, [client.id])

  const nextSessionNumber = (client.session_count || 0) + 1

  const updateSet = (i, field, val) => setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)))
  const addSetRow = () => setSets((prev) => [...prev, { weight: '', reps: '', rpe: '' }])
  const removeSetRow = (i) => setSets((prev) => prev.filter((_, idx) => idx !== i))

  const canAddExercise = exercise.trim() && sets.every((s) => s.weight !== '' && s.reps !== '' && s.rpe !== '')

  const handleAddExercise = () => {
    if (!canAddExercise) return
    setSessionExercises((prev) => [
      ...prev,
      {
        id: uid(),
        exercise: exercise.trim(),
        target_reps: targetReps || null,
        sets: sets.map((s) => ({ weight: Number(s.weight), reps: Number(s.reps), rpe: Number(s.rpe) })),
        notes: notes.trim(),
      },
    ])
    setExercise(''); setTargetReps(''); setSets([{ weight: '', reps: '', rpe: '' }]); setNotes('')
  }

  const removeSessionExercise = (id) => setSessionExercises((prev) => prev.filter((e) => e.id !== id))

  const handleSaveSession = async () => {
    if (sessionExercises.length === 0) return
    setSaving(true)

    const { data: session, error: sessionError } = await supabase
      .from('workout_sessions')
      .insert({ client_id: client.id, session_number: nextSessionNumber, date })
      .select()
      .single()

    if (sessionError) { setSaving(false); return }

    const logRows = sessionExercises.map((ex) => ({
      session_id: session.id,
      client_id: client.id,
      exercise: ex.exercise,
      target_reps: ex.target_reps,
      sets: ex.sets,
      notes: ex.notes,
    }))

    const { error: logsError } = await supabase.from('exercise_logs').insert(logRows)
    if (logsError) { setSaving(false); return }

    const { data: updatedClient, error: updateError } = await supabase
      .from('clients')
      .update({ session_count: nextSessionNumber })
      .eq('id', client.id)
      .select()
      .single()

    if (!updateError) onClientUpdate(updatedClient)

    setSessionExercises([])
    setDate(todayISO())
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>
          Session #{nextSessionNumber}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" style={{ width: 'auto', fontSize: 12, padding: '6px 10px' }} />
        </div>
      </div>

      {sessionExercises.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="label">Added to this session</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sessionExercises.map((ex) => (
              <div key={ex.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--gold-soft-bg)', border: '1px solid var(--gold-soft-border)', borderRadius: 8, padding: '10px 12px' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{ex.exercise}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}</div>
                </div>
                <button onClick={() => removeSessionExercise(ex.id)} className="btn btn-ghost" style={{ padding: 4, border: 'none' }}><X size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="label">{sessionExercises.length > 0 ? 'Add another exercise' : 'Add an exercise'}</div>

        <div style={{ marginBottom: 14 }}>
          <input className="input" value={exercise} onChange={(e) => setExercise(e.target.value)} list="my-exercise-suggestions" placeholder="e.g. Barbell Squat" />
          <datalist id="my-exercise-suggestions">
            {suggestions.map((n) => <option key={n} value={n} />)}
          </datalist>
        </div>

        <div style={{ marginBottom: 14 }}>
          <input className="input" type="number" value={targetReps} onChange={(e) => setTargetReps(e.target.value)} placeholder="Target reps (optional)" style={{ width: 160 }} />
        </div>

        <div className="label">Sets</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {sets.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', width: 16 }}>{i + 1}</span>
              <input className="input" type="number" value={s.weight} onChange={(e) => updateSet(i, 'weight', e.target.value)} placeholder="lbs" />
              <input className="input" type="number" value={s.reps} onChange={(e) => updateSet(i, 'reps', e.target.value)} placeholder="reps" />
              <input className="input" type="number" min="1" max="10" value={s.rpe} onChange={(e) => updateSet(i, 'rpe', e.target.value)} placeholder="RPE (how hard, 1-10)" />
              {sets.length > 1 && (
                <button onClick={() => removeSetRow(i)} className="btn btn-ghost" style={{ padding: 4, border: 'none', flexShrink: 0 }}><X size={16} /></button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addSetRow} className="btn btn-ghost" style={{ border: 'none', color: 'var(--gold)', padding: '4px 0', marginBottom: 16 }}>
          <Plus size={14} /> Add set
        </button>

        <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it feel? Any pain? (optional)" style={{ marginBottom: 14, resize: 'none' }} />

        <button onClick={handleAddExercise} disabled={!canAddExercise} className="btn btn-outline" style={{ width: '100%' }}>
          <Plus size={16} /> Add Exercise to Session
        </button>
      </div>

      <button onClick={handleSaveSession} disabled={sessionExercises.length === 0 || saving} className="btn btn-primary" style={{ width: '100%', padding: 14 }}>
        {saving ? <Loader2 className="spin" size={16} /> : saved ? 'Session Saved ✓' : `Save Session${sessionExercises.length > 0 ? ` (${sessionExercises.length} exercise${sessionExercises.length !== 1 ? 's' : ''})` : ''}`}
      </button>
    </div>
  )
}

// ---------- My Progress ----------
function MyProgress({ clientId }) {
  const [loading, setLoading] = useState(true)
  const [logsByExercise, setLogsByExercise] = useState({})

  useEffect(() => {
    supabase
      .from('exercise_logs')
      .select('*, workout_sessions(date, session_number)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          const grouped = {}
          data.forEach((log) => {
            const withDate = { ...log, sessionDate: log.workout_sessions?.date || log.created_at }
            if (!grouped[log.exercise]) grouped[log.exercise] = []
            grouped[log.exercise].push(withDate)
          })
          setLogsByExercise(grouped)
        }
        setLoading(false)
      })
  }, [clientId])

  if (loading) return <div className="loading-row"><Loader2 className="spin" size={16} /> <span>loading…</span></div>

  const exerciseNames = Object.keys(logsByExercise)
  if (exerciseNames.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: 32, textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 8 }}>
        Log your first session to see your progress here.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div className="label" style={{ marginBottom: 10 }}>What to do next</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {exerciseNames.map((name) => {
            const suggestion = suggestNext(logsByExercise[name])
            return (
              <div key={name} className="card" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{suggestion?.text}</div>
                </div>
                <span className={`badge ${suggestion?.tone === 'up' ? 'badge-success' : 'badge-gold'}`} style={{ flexShrink: 0 }}>
                  {suggestion?.tone === 'up' ? 'Progress' : 'Hold'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <div className="label" style={{ marginBottom: 10 }}>History</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {exerciseNames.map((name) => {
            const entries = logsByExercise[name]
            const maxWeight = Math.max(...entries.flatMap((e) => e.sets.map((s) => s.weight)))
            return (
              <div key={name}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <TrendingUp size={14} style={{ color: 'var(--gold)' }} />
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {entries.map((e) => (
                    <div key={e.id} className="card">
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
                        {e.workout_sessions?.date}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {e.sets.map((s, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px' }}>
                            <div style={{ height: 4, borderRadius: 4, background: 'var(--gold)', width: `${Math.max(8, (s.weight / (maxWeight || 1)) * 28)}px` }} />
                            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{s.weight}lb × {s.reps}</span>
                            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: s.rpe >= 9 ? 'var(--clay)' : 'var(--text-dim)' }}>RPE {s.rpe}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
