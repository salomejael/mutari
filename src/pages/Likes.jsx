import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useNavigate, Link } from 'react-router-dom'

export default function Likes() {
  const [likes, setLikes] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      const { data: userData } = await supabase.auth.getUser()
      setUser(userData.user)
      if (userData.user) {
        const { data } = await supabase
          .from('likes')
          .select('*, from_profile:profiles!likes_from_user_id_fkey(id, username, city, profile_image_url), item:items(id, title, condition, size, category, item_images(*))')
          .eq('to_user_id', userData.user.id)
          .order('created_at', { ascending: false })
        setLikes(data || [])
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleLikeBack = async (like) => {
    await supabase.from('likes').insert({ from_user_id: user.id, to_user_id: like.from_user_id, item_id: like.item_id })
    await supabase.from('matches').insert({ item_id: like.item_id, user1_id: user.id, user2_id: like.from_user_id })
    const { data: existingConv } = await supabase.from('conversations').select('id').or(`and(user1_id.eq.${user.id},user2_id.eq.${like.from_user_id}),and(user1_id.eq.${like.from_user_id},user2_id.eq.${user.id})`)
    if (!existingConv || existingConv.length === 0) {
      await supabase.from('conversations').insert({ user1_id: user.id, user2_id: like.from_user_id })
    }
    setLikes(prev => prev.filter(l => l.from_user_id !== like.from_user_id))
    navigate('/chat')
  }

  if (loading) return (
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--accent)', fontSize: '14px' }}>
      Loading...
    </div>
  )

  // Gruppiere likes nach user
  const groupedLikes = likes.reduce((acc, like) => {
    const uid = like.from_user_id
    if (!acc[uid]) acc[uid] = { profile: like.from_profile, items: [], firstLike: like }
    acc[uid].items.push(like)
    return acc
  }, {})

  const groups = Object.values(groupedLikes)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', fontFamily: 'Inter, system-ui, sans-serif', paddingTop: '80px', paddingBottom: '40px' }}>
      {groups.length === 0 ? (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center', width: '280px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>No likes yet</p>
          <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>Start discovering items in the feed and like what you love to get matches.</p>
          <Link to="/home" className="edit-settings-btn" style={{ marginTop: '8px' }}>
            Go to Feed
          </Link>
        </div>
      ) : (
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {groups.map(group => {
            const firstItem = group.items[0]
            const allCovers = group.items.map(like => like.item?.item_images?.find(img => img.is_cover) || like.item?.item_images?.[0]).filter(Boolean)
            return (
              <div key={group.profile?.id} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>

                {/* User Header */}
                <div onClick={() => navigate(`/user/${group.profile?.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', cursor: 'pointer' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: '20px', fontWeight: '700', overflow: 'hidden', flexShrink: 0 }}>
                    {group.profile?.profile_image_url ? (
                      <img src={group.profile.profile_image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      group.profile?.username?.[0]?.toUpperCase()
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>{group.profile?.username}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{group.profile?.city} · {group.items.length} {group.items.length === 1 ? 'item liked' : 'items liked'}</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>

                {/* Item Thumbnails */}
                <div style={{ display: 'flex', gap: '8px', padding: '0 16px 16px', overflowX: 'auto' }}>
                  {group.items.map(like => {
                    const cover = like.item?.item_images?.find(img => img.is_cover) || like.item?.item_images?.[0]
                    return (
                      <div key={like.id} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', width: '72px' }}>
                        <div style={{ width: '72px', height: '72px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#F0F0F0' }}>
                          {cover ? (
                            <img src={cover.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '24px' }}>◈</div>
                          )}
                        </div>
                        <p style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{like.item?.title}</p>
                      </div>
                    )
                  })}
                </div>

                {/* Like back button */}
                <div style={{ padding: '0 16px 16px' }}>
                  <button onClick={() => handleLikeBack(firstItem)} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: 'none', backgroundColor: 'var(--accent)', color: '#FFFFFF', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                    Like back
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
