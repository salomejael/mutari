import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const [items, setItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  const [current, setCurrent] = useState(0)
  const [imageIndex, setImageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [matchUser, setMatchUser] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [activeFilterGroup, setActiveFilterGroup] = useState(null)
  const [filters, setFilters] = useState({ sizes: [], categories: [], conditions: [] })
  const [hasOwnItems, setHasOwnItems] = useState(true)
  const [swipeDir, setSwipeDir] = useState(null)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const cardRef = useRef(null)
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
    checkOwnItems()
    fetchItems()
  }, [user])

  useEffect(() => {
    applyFilters(items)
  }, [filters, items])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (filteredItems.length === 0) return
      if (e.key === 'ArrowRight') triggerSwipe('right')
      if (e.key === 'ArrowLeft') triggerSwipe('left')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredItems, current])

  const checkOwnItems = async () => {
    const { data } = await supabase.from('items').select('id').eq('user_id', user.id).limit(1)
    setHasOwnItems(data && data.length > 0)
  }

  const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const applyFilters = (data) => {
    let result = data || []
    if (filters.sizes.length > 0) result = result.filter(i => filters.sizes.includes(i.size))
    if (filters.categories.length > 0) result = result.filter(i => filters.categories.includes(i.category))
    if (filters.conditions.length > 0) result = result.filter(i => filters.conditions.includes(i.condition))
    setFilteredItems(result)
    setCurrent(0)
  }

  const toggleFilter = (field, value) => {
    setFilters(prev => {
      const cur = prev[field]
      return { ...prev, [field]: cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value] }
    })
  }

  const fetchItems = async () => {
    setLoading(true)
    const { data: likedData } = await supabase.from('likes').select('item_id').eq('from_user_id', user.id)
    const { data: dislikedData } = await supabase.from('dislikes').select('item_id').eq('from_user_id', user.id)
    const excludeIds = [...(likedData || []).map(l => l.item_id), ...(dislikedData || []).map(d => d.item_id)]
    let query = supabase.from('items').select('*, item_images(*), profiles(id, username, city, profile_image_url, latitude, longitude, search_radius_km)').neq('user_id', user.id).order('created_at', { ascending: false })
    if (excludeIds.length > 0) query = query.not('id', 'in', `(${excludeIds.join(',')})`)
    const { data } = await query
    const { data: myProfile } = await supabase.from('profiles').select('latitude, longitude, search_radius_km').eq('id', user.id).single()

    let filtered = data || []
    if (myProfile?.latitude && myProfile?.longitude) {
      filtered = filtered
        .filter(item => {
          if (!item.profiles?.latitude || !item.profiles?.longitude) return true
          return haversine(myProfile.latitude, myProfile.longitude, item.profiles.latitude, item.profiles.longitude) <= (myProfile.search_radius_km || 50)
        })
        .map(item => {
          if (!item.profiles?.latitude || !item.profiles?.longitude) return item
          return { ...item, distance: haversine(myProfile.latitude, myProfile.longitude, item.profiles.latitude, item.profiles.longitude) }
        })
    }
    setItems(filtered)
    setLoading(false)
  }

  const triggerSwipe = (dir) => {
    setSwipeDir(dir)
    setTimeout(() => {
      if (dir === 'right') handleLike()
      else handleDislike()
      setSwipeDir(null)
    }, 350)
  }

  const handleLike = async () => {
    const item = filteredItems[current]
    if (!item) return
    await supabase.from('likes').insert({ from_user_id: user.id, to_user_id: item.user_id, item_id: item.id })
    const { data: matchCheck } = await supabase.from('likes').select('id').eq('from_user_id', item.user_id).eq('to_user_id', user.id)
    if (matchCheck && matchCheck.length > 0) {
      await supabase.from('matches').insert({ item_id: item.id, user1_id: user.id, user2_id: item.user_id })
      const { data: existingConv } = await supabase.from('conversations').select('id').or(`and(user1_id.eq.${user.id},user2_id.eq.${item.user_id}),and(user1_id.eq.${item.user_id},user2_id.eq.${user.id})`)
      if (!existingConv || existingConv.length === 0) {
        await supabase.from('conversations').insert({ user1_id: user.id, user2_id: item.user_id })
      }
      setMatchUser(item.profiles)
    }
    nextItem()
  }

  const handleDislike = async () => {
    const item = filteredItems[current]
    if (!item) return
    await supabase.from('dislikes').insert({ from_user_id: user.id, item_id: item.id })
    nextItem()
  }

  const nextItem = () => {
    setImageIndex(0)
    if (current + 1 < filteredItems.length) setCurrent(current + 1)
    else { setCurrent(0); fetchItems() }
  }

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (Math.abs(deltaX) > 60 && deltaY < 80) {
      triggerSwipe(deltaX > 0 ? 'right' : 'left')
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  const activeFiltersCount = filters.sizes.length + filters.categories.length + filters.conditions.length

  const groupConfig = [
    { key: 'sizes', label: 'Size', options: ['XXS','XS','S','M','L','XL','XXL','One Size'] },
    { key: 'categories', label: 'Category', options: ['Tops','Bottoms','Dresses','Outerwear','Shoes','Accessories'] },
    { key: 'conditions', label: 'Condition', options: ['New','Like New','Good','Fair','Worn'] },
  ]

  const Chip = ({ label, value, field }) => {
    const active = filters[field].includes(value)
    return (
      <div onClick={() => toggleFilter(field, value)} style={{ padding: '5px 12px', borderRadius: '20px', border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`, backgroundColor: active ? '#FFF0F0' : 'var(--bg-card)', color: active ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: active ? '600' : '400', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {label}
      </div>
    )
  }

  const EmptyState = ({ hasFilters }) => (
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center', width: '280px' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
      </svg>
      {hasFilters ? (
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>No items match your filters</p>
      ) : (
        <>
          <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>No items found nearby</p>
          <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>Try adjusting your filter settings or update your location and search radius to discover more items.</p>
          <button onClick={() => navigate('/settings')} className="edit-settings-btn" style={{ marginTop: '8px' }}>Edit Location</button>
        </>
      )}
    </div>
  )

  const FilterHeader = () => (
    <div style={{ padding: '16px 24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => { setShowFilters(!showFilters); setActiveFilterGroup(null) }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: activeFiltersCount > 0 ? 'var(--accent)' : 'var(--text-secondary)', fontFamily: 'Inter, system-ui, sans-serif', flexShrink: 0, padding: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
          Filter {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </button>
        {showFilters && (
          <>
            {groupConfig.map(group => {
              const count = filters[group.key].length
              const isActive = activeFilterGroup === group.key
              return (
                <button key={group.key} onClick={() => setActiveFilterGroup(isActive ? null : group.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: isActive || count > 0 ? '700' : '500', color: isActive || count > 0 ? 'var(--accent)' : 'var(--text-secondary)', fontFamily: 'Inter, system-ui, sans-serif', padding: 0, whiteSpace: 'nowrap' }}>
                  {group.label}{count > 0 ? ` (${count})` : ''}
                </button>
              )
            })}
            {activeFiltersCount > 0 && (
              <button onClick={() => { setFilters({ sizes: [], categories: [], conditions: [] }); setActiveFilterGroup(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'Inter, system-ui, sans-serif', padding: 0, marginLeft: 'auto' }}>
                Clear
              </button>
            )}
          </>
        )}
      </div>
      {showFilters && activeFilterGroup && (
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', marginTop: '10px' }}>
          {groupConfig.find(g => g.key === activeFilterGroup)?.options.map(opt => (
            <Chip key={opt} label={opt} value={opt} field={activeFilterGroup} />
          ))}
        </div>
      )}
    </div>
  )

  if (loading) return (
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--accent)', fontSize: '14px' }}>
      Loading...
    </div>
  )

  if (!hasOwnItems) return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', fontFamily: 'Inter, system-ui, sans-serif', paddingTop: '80px' }}>
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center', width: '300px' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
        </svg>
        <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Welcome to mutari!</p>
        <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>Before you start discovering items, add at least one item of your own so others can swap with you.</p>
        <button onClick={() => navigate('/profile?addItem=true')} className="edit-settings-btn" style={{ marginTop: '8px' }}>Add your first item</button>
      </div>
    </div>
  )

  if (filteredItems.length === 0) return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', fontFamily: 'Inter, system-ui, sans-serif', paddingTop: '80px' }}>
      <FilterHeader />
      <EmptyState hasFilters={activeFiltersCount > 0} />
    </div>
  )

  const item = filteredItems[current]
  const images = item.item_images?.sort((a, b) => a.order_index - b.order_index) || []
  const activeImage = images[imageIndex]

  const swipeStyle = swipeDir === 'right'
    ? { transform: 'translateX(120%) rotate(15deg)', opacity: 0, transition: 'transform 0.35s ease, opacity 0.35s ease' }
    : swipeDir === 'left'
    ? { transform: 'translateX(-120%) rotate(-15deg)', opacity: 0, transition: 'transform 0.35s ease, opacity 0.35s ease' }
    : { transform: 'translateX(0) rotate(0deg)', opacity: 1, transition: 'transform 0.2s ease' }

  return (
    <div
      style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', fontFamily: 'Inter, system-ui, sans-serif', paddingTop: '80px', paddingBottom: '24px' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <FilterHeader />

      <div ref={cardRef} style={{ margin: '12px 24px', ...swipeStyle }}>
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ width: '100%', height: '420px', position: 'relative', overflow: 'hidden', backgroundColor: '#F9F9F9' }}>
            {activeImage && (
              <img src={activeImage.image_url} alt={item.title} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 1 }} />
            )}
            {!activeImage && (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '48px' }}>◈</div>
            )}
            {images.length > 1 && (
              <>
                <div onClick={() => setImageIndex(Math.max(0, imageIndex - 1))} style={{ position: 'absolute', left: 0, top: 0, width: '40%', height: '100%', cursor: 'pointer', zIndex: 2 }} />
                <div onClick={() => setImageIndex(Math.min(images.length - 1, imageIndex + 1))} style={{ position: 'absolute', right: 0, top: 0, width: '40%', height: '100%', cursor: 'pointer', zIndex: 2 }} />
              </>
            )}
          </div>

          {images.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', overflowX: 'auto', backgroundColor: 'var(--bg-input)' }}>
              {images.map((img, i) => (
                <div key={i} onClick={() => setImageIndex(i)} style={{ width: '60px', height: '60px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, cursor: 'pointer', border: i === imageIndex ? '2.5px solid var(--accent)' : '2.5px solid transparent', boxSizing: 'border-box', opacity: i === imageIndex ? 1 : 0.6 }}>
                  <img src={img.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{item.title}</h2>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {item.size && <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-input)', padding: '4px 12px', borderRadius: '8px' }}>{item.size}</span>}
                {item.condition && <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-input)', padding: '4px 12px', borderRadius: '8px' }}>{item.condition}</span>}
              </div>
            </div>
            {item.description && (
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>{item.description}</p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: '14px', fontWeight: '700', overflow: 'hidden', flexShrink: 0 }}>
                {item.profiles?.profile_image_url ? (
                  <img src={item.profiles.profile_image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  item.profiles?.username?.[0]?.toUpperCase()
                )}
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{item.profiles?.username}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {item.profiles?.city}
                  {item.distance != null && (
                    <span style={{ marginLeft: '6px', color: 'var(--accent)', fontWeight: '600' }}>
                      · {item.distance < 1 ? '<1' : Math.round(item.distance)} km
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Like / Dislike overlay indicators */}
      {swipeDir === 'right' && (
        <div style={{ position: 'fixed', top: '50%', left: '10%', transform: 'translateY(-50%) rotate(-20deg)', border: '4px solid #22c55e', borderRadius: '12px', padding: '8px 20px', color: '#22c55e', fontSize: '32px', fontWeight: '900', opacity: 0.9, zIndex: 50, pointerEvents: 'none' }}>
          LIKE
        </div>
      )}
      {swipeDir === 'left' && (
        <div style={{ position: 'fixed', top: '50%', right: '10%', transform: 'translateY(-50%) rotate(20deg)', border: '4px solid var(--accent)', borderRadius: '12px', padding: '8px 20px', color: 'var(--accent)', fontSize: '32px', fontWeight: '900', opacity: 0.9, zIndex: 50, pointerEvents: 'none' }}>
          NOPE
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', padding: '8px 24px' }}>
        <button onClick={() => triggerSwipe('left')} style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--accent)', backgroundColor: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(185,28,28,0.2)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
        </button>
        <button onClick={() => triggerSwipe('right')} style={{ width: '64px', height: '64px', borderRadius: '50%', border: 'none', backgroundColor: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(185,28,28,0.3)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

      {matchUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '200', padding: '24px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '28px', padding: '40px', textAlign: 'center', width: '100%', maxWidth: '360px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>♥</div>
            <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent)', marginBottom: '8px', fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '2px' }}>Its a Match!</h2>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '28px' }}>You and <strong style={{ color: 'var(--text-primary)' }}>{matchUser.username}</strong> liked each other</p>
            <button onClick={() => setMatchUser(null)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-primary)', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
              Keep Swiping
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
