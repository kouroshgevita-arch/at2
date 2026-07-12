import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import CoachDashboard from './pages/CoachDashboard'
import ClientDashboard from './pages/ClientDashboard'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = not checked yet, null = logged out
  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setProfile(null)
      return
    }
    setLoadingProfile(true)
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (!error) setProfile(data)
        setLoadingProfile(false)
      })
  }, [session])

  if (session === undefined || (session && loadingProfile)) {
    return (
      <div className="center-screen">
        <div className="loading-row">
          <Loader2 className="spin" size={18} />
          <span>loading…</span>
        </div>
      </div>
    )
  }

  if (!session) return <Login />

  if (!profile) {
    return (
      <div className="center-screen">
        <div className="loading-row">
          <Loader2 className="spin" size={18} />
          <span>setting up your account…</span>
        </div>
      </div>
    )
  }

  return profile.role === 'coach' ? (
    <CoachDashboard profile={profile} />
  ) : (
    <ClientDashboard profile={profile} />
  )
}
