import { useState, useEffect, useMemo } from 'react'
import {
  Plus, ChevronRight, Search, X, LogOut, Loader2, Copy, Check, TrendingUp, Library as LibraryIcon, Users,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { suggestNext, uid, todayISO } from '../lib/suggestionEngine'

export default function CoachDashboard({ profile }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [view, setView] = useState('overview')
  const [showNewClient, setShowNewClient] = useState(false)
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState('clients') // clients | library

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('coach_id', profile.id)
      .order('created_at', { ascending: false })
    if (!error) setClients(data)
    setLoading(false)
  }

  const client = clients.find((c) => c.id === selectedId)

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients
    return clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
  }, [clients, search])

  const handleAddClient = async (payload) => {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        coach_id: profile.id,
        name: payload.name,
        goal: payload.goal,
        pain_areas: payload.painAreas,
        notes: payload.notes,
      })
      .select()
      .single()
    if (!error) {
      setClients((prev) => [data, ...prev])
      setSelectedId(data.id)
      setShowNewClient(false)
      setView('overview')
    }
  }

  const updateClientLocal = (updated) => {
    setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
  }

  return (
    <div className="app-shell">
      <div className="sidebar">
        <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#B8935B', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 4 }}>
            Client Tracker
          </div>
          <div className="display-heading" style={{ fontSize: 24 }}>YOUR ROSTER</div>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: 12, borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setMode('clients')}
            className={mode === 'clients' ? 'btn btn-primary' : 'btn btn-ghost'}
            style={{ flex: 1, fontSize: 13 }}
          >
            <Users size={14} /> Clients
          </button>
          <button
            onClick={() => { setMode('library'); setSelectedId(null) }}
            className={mode === 'library' ? 'btn btn-primary' : 'btn btn-ghost'}
            style={{ flex: 1, fontSize: 13 }}
          >
            <LibraryIcon size={14} /> Library
          </button>
        </div>

        <div style={{ padding: 12 }}>
          <button onClick={() => setShowNewClient(true)} className="btn btn-primary" style={{ width: '100%' }}>
            <Plus size={16} /> Add Client
          </button>
        </div>

        <div style={{ padding: '0 12px 12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients"
              className="input"
              style={{ paddingLeft: 30 }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px' }}>
          {loading && (
            <div className="loading-row" style={{ padding: 16, justifyContent: 'center' }}>
              <Loader2 className="spin" size={16} /> <span>loading…</span>
            </div>
          )}
          {!loading && filteredClients.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 14, marginTop: 40, padding: '0 16px' }}>
              {clients.length === 0 ? 'No clients yet. Add your first one above.' : 'No matches.'}
            </div>
          )}
          {filteredClients.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelectedId(c.id); setView('overview'); setMode('clients') }}
              className={`client-row ${selectedId === c.id ? 'active' : ''}`}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.goal || 'No goal set'}
                </div>
              </div>
              <ChevronRight size={14} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
            </button>
          ))}
        </div>

        <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <button onClick={() => supabase.auth.signOut()} className="btn btn-ghost" style={{ width: '100%' }}>
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </div>

      <div className="main-content">
        {mode === 'library' ? (
          <WorkoutLibrary profile={profile} />
        ) : !client ? (
          <div className="center-screen" style={{ minHeight: '60vh' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center' }}>
              Select a client on the left, or add a new one to get started.
            </div>
          </div>
        ) : (
          <ClientDetail client={client} onClientUpdate={updateClientLocal} view={view} setView={setView} />
        )}
      </div>

      {showNewClient && <NewClientModal onClose={() => setShowNewClient(false)} onSave={handleAddClient} />}
    </div>
  )
}

// ---------- Client Detail ----------
function ClientDetail({ client, onClientUpdate, view, setView }) {
  const [copied, setCopied] = useState(false)

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(client.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      // clipboard may be unavailable; fail silently
    }
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 24 }}>
        <div>
          <div className="display-heading" style={{ fontSize: 30 }}>{client.name.toUpperCase()}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{client.goal}</div>
            <div className="badge" style={{ color: 'var(--text-dim)' }}>
              {client.session_count || 0} session{(client.session_count || 0) !== 1 ? 's' : ''} logged
            </div>
          </div>
        </div>
        {client.pain_areas?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {client.pain_areas.map((p) => (
              <span key={p} className="badge badge-clay">{p}</span>
            ))}
          </div>
        )}
      </div>

      {!client.client_auth_id && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            This client hasn't linked their own login yet. Share this invite code so they can sign up and log their own workouts:
          </div>
          <button onClick={copyInvite} className="btn btn-outline" style={{ flexShrink: 0 }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy invite code'}
          </button>
        </div>
      )}

      <div className="tabs">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'assign', label: 'Assign Workouts' },
          { id: 'log', label: 'Log Session' },
          { id: 'history', label: 'History' },
        ].map((t) => (
          <button key={t.id} onClick={() => setView(t.id)} className={`tab ${view === t.id ? 'active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {view === 'overview' && <Overview client={client} />}
      {view === 'assign' && <AssignWorkouts client={client} />}
      {view === 'log' && <LogSession client={client} onClientUpdate={onClientUpdate} />}
      {view === 'history' && <History client={client} />}
    </div>
  )
}

// ---------- Overview ----------
function Overview({ client }) {
  const [loading, setLoading] = useState(true)
  const [logsByExercise, setLogsByExercise] = useState({})

  useEffect(() => {
    loadData()
  }, [client.id])

  const loadData = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('exercise_logs')
      .select('*, workout_sessions(date, session_number)')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })

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
  }

  if (loading) {
    return <div className="loading-row"><Loader2 className="spin" size={16} /> <span>loading…</span></div>
  }

  const exerciseNames = Object.keys(logsByExercise)

  if (exerciseNames.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: 32, textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 8 }}>
        No workouts logged yet. Head to "Log Session" to add the first one.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="label">Next-session suggestions</div>
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
      {client.notes && (
        <div style={{ marginTop: 16 }}>
          <div className="label">Assessment notes</div>
          <div className="card" style={{ fontSize: 14, color: '#c7c5be', whiteSpace: 'pre-wrap' }}>{client.notes}</div>
        </div>
      )}
    </div>
  )
}

// ---------- Assign Workouts ----------
function AssignWorkouts({ client }) {
  const [assigned, setAssigned] = useState([])
  const [loading, setLoading] = useState(true)
  const [exercise, setExercise] = useState('')
  const [targetSets, setTargetSets] = useState('')
  const [targetReps, setTargetReps] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadAssigned()
  }, [client.id])

  const loadAssigned = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('assigned_workouts')
      .select('*')
      .eq('client_id', client.id)
      .eq('active', true)
      .order('created_at', { ascending: true })
    if (!error) setAssigned(data)
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!exercise.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('assigned_workouts')
      .insert({
        client_id: client.id,
        exercise: exercise.trim(),
        target_sets: targetSets || null,
        target_reps: targetReps || null,
        notes: notes.trim(),
      })
      .select()
      .single()
    if (!error) {
      setAssigned((prev) => [...prev, data])
      setExercise(''); setTargetSets(''); setTargetReps(''); setNotes('')
    }
    setSaving(false)
  }

  const handleRemove = async (id) => {
    const { error } = await supabase.from('assigned_workouts').update({ active: false }).eq('id', id)
    if (!error) setAssigned((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div style={{ maxWidth: 500 }}>
      <div className="label" style={{ marginBottom: 12 }}>Current program</div>
      {loading ? (
        <div className="loading-row"><Loader2 className="spin" size={16} /> <span>loading…</span></div>
      ) : assigned.length === 0 ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 20 }}>No exercises assigned yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {assigned.map((a) => (
            <div key={a.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{a.exercise}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {a.target_sets || '—'} sets × {a.target_reps || '—'} reps
                </div>
              </div>
              <button onClick={() => handleRemove(a.id)} className="btn btn-ghost" style={{ padding: 6, border: 'none' }}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="label">Assign an exercise</div>
        <div style={{ marginBottom: 12 }}>
          <input className="input" value={exercise} onChange={(e) => setExercise(e.target.value)} placeholder="e.g. Barbell Squat" />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input className="input" type="number" value={targetSets} onChange={(e) => setTargetSets(e.target.value)} placeholder="Target sets" />
          <input className="input" type="number" value={targetReps} onChange={(e) => setTargetReps(e.target.value)} placeholder="Target reps" />
        </div>
        <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Form cues, notes (optional)" style={{ marginBottom: 12, resize: 'none' }} />
        <button onClick={handleAdd} disabled={!exercise.trim() || saving} className="btn btn-primary" style={{ width: '100%' }}>
          {saving ? <Loader2 className="spin" size={16} /> : 'Assign Exercise'}
        </button>
      </div>
    </div>
  )
}

// ---------- Log Session ----------
function LogSession({ client, onClientUpdate }) {
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
    <div style={{ maxWidth: 500 }}>
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
          <input
            className="input"
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            list="exercise-suggestions"
            placeholder="e.g. Barbell Squat"
          />
          <datalist id="exercise-suggestions">
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
              <input className="input" type="number" min="1" max="10" value={s.rpe} onChange={(e) => updateSet(i, 'rpe', e.target.value)} placeholder="RPE" />
              {sets.length > 1 && (
                <button onClick={() => removeSetRow(i)} className="btn btn-ghost" style={{ padding: 4, border: 'none', flexShrink: 0 }}><X size={16} /></button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addSetRow} className="btn btn-ghost" style={{ border: 'none', color: 'var(--gold)', padding: '4px 0', marginBottom: 16 }}>
          <Plus size={14} /> Add set
        </button>

        <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" style={{ marginBottom: 14, resize: 'none' }} />

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

// ---------- History ----------
function History({ client }) {
  const [loading, setLoading] = useState(true)
  const [logsByExercise, setLogsByExercise] = useState({})
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadData()
  }, [client.id])

  const loadData = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('exercise_logs')
      .select('*, workout_sessions(date, session_number)')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const grouped = {}
      data.forEach((log) => {
        if (!grouped[log.exercise]) grouped[log.exercise] = []
        grouped[log.exercise].push(log)
      })
      setLogsByExercise(grouped)
    }
    setLoading(false)
  }

  if (loading) return <div className="loading-row"><Loader2 className="spin" size={16} /> <span>loading…</span></div>

  const exerciseNames = Object.keys(logsByExercise)
  if (exerciseNames.length === 0) {
    return <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: 32, textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 8 }}>No history yet.</div>
  }

  const visibleExercises = filter === 'all' ? exerciseNames : [filter]

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setFilter('all')} className={`badge ${filter === 'all' ? 'badge-gold' : ''}`} style={{ cursor: 'pointer' }}>All</button>
        {exerciseNames.map((n) => (
          <button key={n} onClick={() => setFilter(n)} className={`badge ${filter === n ? 'badge-gold' : ''}`} style={{ cursor: 'pointer' }}>{n}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {visibleExercises.map((name) => {
          const entries = [...logsByExercise[name]].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {e.workout_sessions?.date}
                        </span>
                        {e.workout_sessions?.session_number && (
                          <span className="badge">Session #{e.workout_sessions.session_number}</span>
                        )}
                      </div>
                      {e.notes && <span style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>{e.notes}</span>}
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
  )
}

// ---------- New Client Modal ----------
function NewClientModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [painAreas, setPainAreas] = useState([])
  const [customPain, setCustomPain] = useState('')
  const [notes, setNotes] = useState('')

  const commonPain = ['Low back', 'Knee', 'Shoulder', 'Neck', 'Hip']

  const togglePain = (p) => setPainAreas((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
  const addCustomPain = () => {
    if (customPain.trim() && !painAreas.includes(customPain.trim())) {
      setPainAreas((prev) => [...prev, customPain.trim()])
      setCustomPain('')
    }
  }

  const canSave = name.trim().length > 0

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="display-heading" style={{ fontSize: 20 }}>NEW CLIENT</div>
          <button onClick={onClose} className="btn btn-ghost" style={{ border: 'none', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="label">Name *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" autoFocus />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="label">Goal</label>
          <input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Pain-free squat, lose 15 lbs" />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="label">Pain / injury areas</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {commonPain.map((p) => (
              <button key={p} onClick={() => togglePain(p)} className={`badge ${painAreas.includes(p) ? 'badge-clay' : ''}`} style={{ cursor: 'pointer' }}>{p}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={customPain} onChange={(e) => setCustomPain(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustomPain()} placeholder="Other area..." />
            <button onClick={addCustomPain} className="btn btn-ghost" style={{ flexShrink: 0 }}><Plus size={14} /></button>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label className="label">Assessment notes</label>
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Posture findings, movement restrictions, history..." style={{ resize: 'none' }} />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
          <button disabled={!canSave} onClick={() => onSave({ name, goal, painAreas, notes })} className="btn btn-primary" style={{ flex: 1 }}>Add Client</button>
        </div>
      </div>
    </div>
  )
}

// ---------- Workout Library (top-level area, not tied to any one client) ----------
function WorkoutLibrary({ profile }) {
  const [tab, setTab] = useState('exercises')

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="display-heading" style={{ fontSize: 30, marginBottom: 4 }}>WORKOUT LIBRARY</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
        Build once here, reuse across any client.
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'exercises' ? 'active' : ''}`} onClick={() => setTab('exercises')}>
          Exercises
        </button>
        {/* Workout Templates tab lands here next round */}
      </div>

      {tab === 'exercises' && <ExerciseLibrary profile={profile} />}
    </div>
  )
}

function ExerciseLibrary({ profile }) {
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [defaultUnit, setDefaultUnit] = useState('reps')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('exercise_library')
      .select('*')
      .eq('coach_id', profile.id)
      .order('name', { ascending: true })
    if (!error) setExercises(data)
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!name.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('exercise_library')
      .insert({
        coach_id: profile.id,
        name: name.trim(),
        category: category.trim() || null,
        default_unit: defaultUnit,
      })
      .select()
      .single()
    if (!error) {
      setExercises((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setName(''); setCategory(''); setDefaultUnit('reps')
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('exercise_library').delete().eq('id', id)
    if (!error) setExercises((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="label">Add an exercise</div>
        <div style={{ marginBottom: 12 }}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Barbell Squat" />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (optional) — e.g. Lower body"
          />
          <select
            className="input"
            value={defaultUnit}
            onChange={(e) => setDefaultUnit(e.target.value)}
            style={{ maxWidth: 150, flexShrink: 0 }}
          >
            <option value="reps">Reps</option>
            <option value="sec">Seconds</option>
            <option value="min">Minutes</option>
          </select>
        </div>
        <button onClick={handleAdd} disabled={!name.trim() || saving} className="btn btn-primary" style={{ width: '100%' }}>
          {saving ? <Loader2 className="spin" size={16} /> : 'Add to Library'}
        </button>
      </div>

      {loading ? (
        <div className="loading-row"><Loader2 className="spin" size={16} /> <span>loading…</span></div>
      ) : exercises.length === 0 ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 14, padding: 24, textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 8 }}>
          No exercises yet — add your first one above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {exercises.map((ex) => (
            <div key={ex.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{ex.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {ex.category || 'Uncategorized'} · logged in {ex.default_unit}
                </div>
              </div>
              <button onClick={() => handleDelete(ex.id)} className="btn btn-ghost" style={{ padding: 6, border: 'none' }}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
