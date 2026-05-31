import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useEffect, useState } from 'react'

const LogoutIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

const ChatIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)

const ProfileIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const LikesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
)

const navStyle = {
  position: 'fixed',
  top: '0',
  left: '0',
  right: '0',
  backgroundColor: '#ffd6ff',
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  alignItems: 'center',
  height: '64px',
  padding: '0 24px',
  zIndex: '100',
  fontFamily: 'Inter, system-ui, sans-serif',
  boxSizing: 'border-box'
}

const leftLinkStyle = {
  textDecoration: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  color: '#1A1A1A',
  fontSize: '14px',
  fontWeight: '500'
}

const titleStyle = {
  fontSize: '16px',
  fontWeight: '700',
  color: '#1A1A1A',
  textAlign: 'center',
  letterSpacing: '0.5px',
  whiteSpace: 'nowrap'
}

const iconBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0',
  display: 'flex',
  alignItems: 'center'
}

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [likesCount, setLikesCount] = useState(0)

  useEffect(() => {
    const fetchLikes = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { data: incomingLikes } = await supabase
        .from('likes')
        .select('from_user_id')
        .eq('to_user_id', userData.user.id)

      const { data: myLikes } = await supabase
        .from('likes')
        .select('to_user_id')
        .eq('from_user_id', userData.user.id)

      const myLikedUserIds = new Set((myLikes || []).map(l => l.to_user_id))
      const openLikes = (incomingLikes || []).filter(l => !myLikedUserIds.has(l.from_user_id))
      setLikesCount(openLikes.length)
    }
    fetchLikes()
  }, [location.pathname])

  if (location.pathname === '/' || location.pathname === '/register') return null

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (location.pathname === '/home') {
    return (
      <nav style={navStyle} className="home-nav">
        <div className="logo-spacer" />
        <span className="mutari-logo">mutari</span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '20px' }}>
          <Link to="/likes" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', width: '22px', height: '22px', position: 'relative' }}>
            <LikesIcon />
            {likesCount > 0 && (
              <div style={{ position: 'absolute', top: '-6px', right: '-6px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--accent)', color: 'white', fontSize: '9px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {likesCount > 9 ? '9+' : likesCount}
              </div>
            )}
          </Link>
          <Link to="/chat" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', width: '22px', height: '22px' }}>
            <ChatIcon />
          </Link>
          <Link to="/profile" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', width: '22px', height: '22px' }}>
            <ProfileIcon />
          </Link>
        </div>
      </nav>
    )
  }

  if (location.pathname === '/profile') {
    return (
      <nav style={navStyle}>
        <Link to="/home" style={leftLinkStyle}>
          <BackIcon /> Feed
        </Link>
        <span style={titleStyle}>My Profile</span>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleLogout} style={iconBtnStyle}>
            <LogoutIcon />
          </button>
        </div>
      </nav>
    )
  }

  if (location.pathname === '/chat') {
    return (
      <nav style={navStyle}>
        <Link to="/home" style={leftLinkStyle}>
          <BackIcon /> Feed
        </Link>
        <span style={titleStyle}>Matches</span>
        <div />
      </nav>
    )
  }

  if (location.pathname === '/settings') {
    return (
      <nav style={navStyle}>
        <Link to="/profile" style={leftLinkStyle}>
          <BackIcon /> Profile
        </Link>
        <span style={titleStyle}>Edit Settings</span>
        <div />
      </nav>
    )
  }

  if (location.pathname === '/likes') {
    return (
      <nav style={navStyle}>
        <Link to="/home" style={leftLinkStyle}>
          <BackIcon /> Feed
        </Link>
        <span style={titleStyle}>Likes</span>
        <div />
      </nav>
    )
  }

  if (location.pathname.startsWith('/user/')) {
    return (
      <nav style={navStyle}>
        <button onClick={() => navigate(-1)} style={{ ...leftLinkStyle, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <BackIcon /> Back
        </button>
        <span style={titleStyle}>Profile</span>
        <div />
      </nav>
    )
  }

  return null
}
