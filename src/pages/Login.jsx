import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [mode, setMode] = useState('login') // login | signup
  const [role, setRole] = useState('client')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        if (role === 'client' && !inviteCode.trim()) {
          throw new Error("Ask your coach for your invite code first — it links your login to the profile they already set up for you.")
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { role, name } },
        })
        if (error) throw error

        if (role === 'client') {
          if (data.session) {
            const { error: claimError } = await supabase.rpc('claim_client_invite', {
              invite_code: inviteCode.trim(),
            })
            if (claimError) {
              throw new Error("That invite code didn't match — double check it with your coach.")
            }
          } else {
            setMessage('Check your email to confirm your account, then log in and we\'ll link your invite code.')
          }
        } else if (!data.session) {
          setMessage('Check your email to confirm your account, then log in.')
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="center-screen">
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <div className="display-heading" style={{ fontSize: 28, marginBottom: 4 }}>
          {mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
          Client Tracker
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setRole('client')}
                className={role === 'client' ? 'btn btn-primary' : 'btn btn-ghost'}
                style={{ flex: 1 }}
              >
                I'm a client
              </button>
              <button
                type="button"
                onClick={() => setRole('coach')}
                className={role === 'coach' ? 'btn btn-primary' : 'btn btn-ghost'}
                style={{ flex: 1 }}
              >
                I'm the coach
              </button>
            </div>
          )}

          {mode === 'signup' && (
            <div style={{ marginBottom: 14 }}>
              <label className="label">Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {mode === 'signup' && role === 'client' && (
            <div style={{ marginBottom: 14 }}>
              <label className="label">Invite code (from your coach)</label>
              <input className="input" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required />
            </div>
          )}

          {error && <div style={{ color: 'var(--clay)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          {message && <div style={{ color: 'var(--success)', fontSize: 13, marginBottom: 12 }}>{message}</div>}

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
            {loading ? <Loader2 className="spin" size={16} /> : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setError('')
            setMessage('')
          }}
          className="btn btn-ghost"
          style={{ width: '100%', marginTop: 12 }}
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  )
}
