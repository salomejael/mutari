import { useState } from 'react'
import { supabase } from '../supabase'
import { useNavigate, Link } from 'react-router-dom'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [city, setCity] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    let latitude = null
    let longitude = null
    if (city) {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`)
      const data = await res.json()
      if (data.length > 0) {
        latitude = parseFloat(data[0].lat)
        longitude = parseFloat(data[0].lon)
      }
    }

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({ id: data.user.id, username, city, latitude, longitude })
    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    navigate('/home')
  }

  const inputStyle = { width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid #EEEEEE', backgroundColor: '#F9F9F9', fontSize: '15px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }

  const focusNext = (id) => document.getElementById(id)?.focus()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffd6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '80px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '8px', lineHeight: '1', marginBottom: '12px', fontFamily: 'Inter, system-ui, sans-serif' }}>
            mutari
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-primary)', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: '500' }}>
            Worn again - just not by you
          </p>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '28px', padding: '40px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '28px' }}>Create account</h2>

          {error && (
            <div style={{ backgroundColor: '#FEE2E2', color: 'var(--accent)', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Username</label>
            <input id="reg-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && focusNext('reg-city')} placeholder="yourname" autoFocus tabIndex={1} style={inputStyle} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>City</label>
            <input id="reg-city" type="text" value={city} onChange={(e) => setCity(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && focusNext('reg-email')} placeholder="Zurich" tabIndex={2} style={inputStyle} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Email</label>
            <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && focusNext('reg-password')} placeholder="you@example.com" tabIndex={3} style={inputStyle} />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={labelStyle}>Password</label>
            <input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRegister(e)} placeholder="••••••••" tabIndex={4} style={inputStyle} />
          </div>

          <button onClick={handleRegister} disabled={loading} tabIndex={5} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: 'var(--accent)', color: '#FFFFFF', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxSizing: 'border-box' }}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)', marginTop: '24px' }}>
            Already have an account?{' '}
            <Link to="/" style={{ color: 'var(--accent-light)', fontWeight: '600', textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
