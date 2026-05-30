import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useParams, useNavigate } from 'react-router-dom'

export default function UserProfile() {
  const { userId } = useParams()
  const [profile, setProfile] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [previewImage, setPreviewImage] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [imageIndex, setImageIndex] = useState(0)
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      const { data: userData } = await supabase.auth.getUser()
      setUser(userData.user)
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single()
      setProfile(profileData)
      const { data: itemsData } = await supabase.from('items').select('*, item_images(*)').eq('user_id', userId).order('created_at', { ascending: false })
      setItems(itemsData || [])
      setLoading(false)
    }
    fetchData()
  }, [userId])

  const handleLikeBack = async (itemId) => {
    if (!user) return
    await supabase.from('likes').insert({ from_user_id: user.id, to_user_id: userId, item_id: itemId })
    const { data: matchCheck } = await supabase.from('likes').select('id').eq('from_user_id', userId).eq('to_user_id', user.id)
    if (matchCheck && matchCheck.length > 0) {
      await supabase.from('matches').insert({ item_id: itemId, user1_id: user.id, user2_id: userId })
      const { data: existingConv } = await supabase.from('conversations').select('id').or(`and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`)
      if (!existingConv || existingConv.length === 0) {
        await supabase.from('conversations').insert({ user1_id: user.id, user2_id: userId })
      }
      navigate('/chat')
    }
  }

  if (loading) return (
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--accent)', fontSize: '14px' }}>
      Loading...
    </div>
  )

  const images = selectedItem?.item_images?.sort((a, b) => a.order_index - b.order_index) || []

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', fontFamily: 'Inter, system-ui, sans-serif', paddingTop: '80px', paddingBottom: '40px' }}>

      {/* Image Preview */}
      {previewImage && (
        <div onClick={() => setPreviewImage(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <img src={previewImage} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '16px', objectFit: 'contain' }} />
          <div style={{ position: 'absolute', top: '24px', right: '24px', width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FFFFFF', fontSize: '18px' }}>✕</div>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '28px 28px 0 0', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ height: '360px', backgroundColor: '#F9F9F9', position: 'relative', overflow: 'hidden' }}>
                {images[imageIndex] && (
                  <img src={images[imageIndex].image_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                )}
                {images.length > 1 && (
                  <>
                    <div onClick={() => setImageIndex(Math.max(0, imageIndex - 1))} style={{ position: 'absolute', left: 0, top: 0, width: '40%', height: '100%', cursor: 'pointer' }} />
                    <div onClick={() => setImageIndex(Math.min(images.length - 1, imageIndex + 1))} style={{ position: 'absolute', right: 0, top: 0, width: '40%', height: '100%', cursor: 'pointer' }} />
                  </>
                )}
                {images.length > 1 && (
                  <div style={{ position: 'absolute', top: '12px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '6px' }}>
                    {images.map((_, i) => (
                      <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: i === imageIndex ? 'var(--accent)' : 'rgba(0,0,0,0.2)' }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', overflowX: 'auto', backgroundColor: 'var(--bg-input)' }}>
                  {images.map((img, i) => (
                    <div key={i} onClick={() => setImageIndex(i)} style={{ width: '56px', height: '56px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, cursor: 'pointer', border: i === imageIndex ? '2px solid var(--accent)' : '2px solid transparent', opacity: i === imageIndex ? 1 : 0.6 }}>
                      <img src={img.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => { setSelectedItem(null); setImageIndex(0) }} style={{ position: 'absolute', top: '16px', right: '16px', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: 'var(--text-secondary)' }}>✕</button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedItem.title}</h2>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {selectedItem.size && <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-input)', padding: '4px 12px', borderRadius: '8px' }}>{selectedItem.size}</span>}
                  {selectedItem.condition && <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-input)', padding: '4px 12px', borderRadius: '8px' }}>{selectedItem.condition}</span>}
                </div>
              </div>
              {selectedItem.description && (
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>{selectedItem.description}</p>
              )}
              <button onClick={() => handleLikeBack(selectedItem.id)} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', backgroundColor: 'var(--accent)', color: '#FFFFFF', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                Like this item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div style={{ margin: '24px 24px 16px', backgroundColor: 'var(--bg-card)', borderRadius: '28px', padding: '28px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '90px', height: '90px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: '36px', fontWeight: '700', overflow: 'hidden' }}>
          {profile?.profile_image_url ? (
            <img src={profile.profile_image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '36px', fontWeight: '700', color: '#FFFFFF' }}>{profile?.username?.[0]?.toUpperCase()}</span>
          )}
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{profile?.username}</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{profile?.city}</p>
        </div>
      </div>

      {/* Items */}
      <div style={{ margin: '0 24px', backgroundColor: 'var(--bg-card)', borderRadius: '28px', padding: '24px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>Items ({items.length})</h3>
        {items.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', padding: '24px 0' }}>No items yet</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {items.map(item => {
              const cover = item.item_images?.find(img => img.is_cover) || item.item_images?.[0]
              return (
                <div key={item.id} onClick={() => { setSelectedItem(item); setImageIndex(0) }} style={{ backgroundColor: 'var(--bg)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', cursor: 'pointer' }}>
                  <div style={{ height: '160px', backgroundColor: '#F0F0F0' }}>
                    {cover ? (
                      <img src={cover.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: 'var(--text-secondary)' }}>◈</div>
                    )}
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>{item.title}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.size} · {item.category} {item.condition && '· ' + item.condition}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
