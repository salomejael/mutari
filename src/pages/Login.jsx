import { useState } from 'react'
import { supabase } from '../supabase'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/home')
    }
  }

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
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '28px' }}>Welcome back</h2>

          {error && (
            <div style={{ backgroundColor: '#FEE2E2', color: 'var(--accent)', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('password-login').focus() }}
              placeholder="you@example.com"
              autoFocus
              tabIndex={1}
              style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid #EEEEEE', backgroundColor: '#F9F9F9', fontSize: '15px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
            <input
              id="password-login"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(e) }}
              placeholder="••••••••"
              tabIndex={2}
              style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid #EEEEEE', backgroundColor: '#F9F9F9', fontSize: '15px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            tabIndex={3}
            style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: 'var(--accent)', color: '#FFFFFF', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxSizing: 'border-box' }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)', marginTop: '24px' }}>
            No account yet?{' '}
            <Link to="/register" style={{ color: 'var(--accent-light)', fontWeight: '600', textDecoration: 'none' }}>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
