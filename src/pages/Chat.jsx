import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'
import { Link, useNavigate } from 'react-router-dom'

export default function Chat() {
  const [user, setUser] = useState(null)
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [likesCount, setLikesCount] = useState(0)
  const [openMenuId, setOpenMenuId] = useState(null)
  const messagesEndRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }
    fetchUser()
  }, [])

  useEffect(() => {
    if (!user) return
    fetchConversations()
    fetchLikesCount()
  }, [user])

  useEffect(() => {
    if (!activeConv) return
    fetchMessages(activeConv.id)
    const channel = supabase
      .channel('messages:' + activeConv.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConv.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [activeConv])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchLikesCount = async () => {
    const { data } = await supabase.from('likes').select('id').eq('to_user_id', user.id)
    setLikesCount(data?.length || 0)
  }

  const fetchConversations = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('conversations')
      .select('*, user1:profiles!conversations_user1_id_fkey(id, username, profile_image_url), user2:profiles!conversations_user2_id_fkey(id, username, profile_image_url)')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
    setConversations(data || [])
    setLoading(false)
  }

  const fetchMessages = async (convId) => {
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true })
    setMessages(data || [])
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConv) return
    await supabase.from('messages').insert({ conversation_id: activeConv.id, sender_id: user.id, content: newMessage.trim() })
    setNewMessage('')
  }

  const handleDeleteMatch = async (convId) => {
    await supabase.from('conversations').delete().eq('id', convId)
    setOpenMenuId(null)
    fetchConversations()
  }

  const handleMarkSwapped = async (convId) => {
    await supabase.from('conversations').update({ status: 'swapped' }).eq('id', convId)
    setOpenMenuId(null)
    fetchConversations()
  }

  const getOtherUser = (conv) => {
    return conv.user1_id === user.id ? conv.user2 : conv.user1
  }

  const getOtherUserId = (conv) => {
    return conv.user1_id === user.id ? conv.user2_id : conv.user1_id
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return (
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--accent)', fontSize: '14px' }}>
      Loading...
    </div>
  )

  if (activeConv) {
    const otherUser = getOtherUser(activeConv)
    const otherUserId = getOtherUserId(activeConv)
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>

        <div style={{ position: 'fixed', top: '0', left: '0', right: '0', backgroundColor: '#ffd6ff', padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', zIndex: '100', height: '64px', boxSizing: 'border-box' }}>
          <button onClick={() => setActiveConv(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#1A1A1A', fontSize: '14px', fontWeight: '500', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }} />
        </div>

        <div onClick={() => navigate(`/user/${otherUserId}`)} style={{ marginTop: '64px', backgroundColor: '#ffd6ff', padding: '12px 24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: '18px', fontWeight: '700', overflow: 'hidden' }}>
            {otherUser?.profile_image_url ? (
              <img src={otherUser.profile_image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              otherUser?.username?.[0]?.toUpperCase()
            )}
          </div>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A' }}>{otherUser?.username}</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 100px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', marginTop: '40px' }}>
              Start the conversation!
            </div>
          )}
          {messages.map(msg => {
            const isOwn = msg.sender_id === user.id
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '70%', padding: '12px 16px', borderRadius: isOwn ? '20px 20px 4px 20px' : '20px 20px 20px 4px', backgroundColor: isOwn ? 'var(--accent)' : 'var(--bg-card)', color: isOwn ? '#FFFFFF' : 'var(--text-primary)', fontSize: '14px', lineHeight: '1.5', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <p>{msg.content}</p>
                  <p style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px', textAlign: 'right' }}>{formatTime(msg.created_at)}</p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ position: 'fixed', bottom: '0', left: '0', right: '0', backgroundColor: 'var(--bg-card)', padding: '16px 24px', display: 'flex', gap: '12px', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
          <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1.5px solid var(--border)', backgroundColor: 'var(--bg-input)', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', fontFamily: 'Inter, system-ui, sans-serif' }} />
          <button onClick={sendMessage} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', backgroundColor: 'var(--accent)', color: '#FFFFFF', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            &#8594;
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', fontFamily: 'Inter, system-ui, sans-serif', paddingTop: '80px', paddingBottom: '40px' }}>
      {conversations.length === 0 ? (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center', width: '280px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>No matches yet</p>
          <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>Discover items in the feed and like what you love to get your first match.</p>
          <Link to="/home" className="edit-settings-btn" style={{ marginTop: '8px' }}>Go to Feed</Link>
          {likesCount > 0 && (
            <Link to="/likes" className="edit-settings-btn" style={{ marginTop: '4px' }}>
              View your {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
            </Link>
          )}
        </div>
      ) : (
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {conversations.map(conv => {
            const otherUser = getOtherUser(conv)
            const isSwapped = conv.status === 'swapped'
            const isMenuOpen = openMenuId === conv.id
            return (
              <div key={conv.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div onClick={() => setActiveConv(conv)} style={{ flex: 1, backgroundColor: 'var(--bg-card)', borderRadius: '20px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', opacity: isSwapped ? 0.6 : 1 }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: '20px', fontWeight: '700', overflow: 'hidden', flexShrink: 0 }}>
                    {otherUser?.profile_image_url ? (
                      <img src={otherUser.profile_image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      otherUser?.username?.[0]?.toUpperCase()
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{otherUser?.username}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{isSwapped ? 'Swapped' : 'Tap to open conversation'}</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : conv.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#1A1A1A' }} />
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#1A1A1A' }} />
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#1A1A1A' }} />
                  </button>
                  {isMenuOpen && (
                    <div style={{ position: 'absolute', top: '36px', right: '0', backgroundColor: 'var(--bg-card)', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden', zIndex: 200, minWidth: '180px' }}>
                      <div onClick={() => handleMarkSwapped(conv.id)} style={{ padding: '14px 20px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
                        Mark as Swapped
                      </div>
                      <div onClick={() => handleDeleteMatch(conv.id)} style={{ padding: '14px 20px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', color: 'var(--accent)' }}>
                        Delete Match
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
