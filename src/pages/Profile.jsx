import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { Link, useSearchParams } from 'react-router-dom'
import { compressImage } from '../utils/compressImage'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddItem, setShowAddItem] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [newItem, setNewItem] = useState({ title: '', description: '', size: '', category: '', condition: '' })
  const [newImages, setNewImages] = useState([])
  const [existingImages, setExistingImages] = useState([])
  const [saving, setSaving] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const [errors, setErrors] = useState({})
  const [showErrors, setShowErrors] = useState(false)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      if (data.user) {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
        setProfile(profileData)
        const { data: itemsData } = await supabase.from('items').select('*, item_images(*)').eq('user_id', data.user.id).order('created_at', { ascending: false })
        setItems(itemsData || [])
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (!loading && searchParams.get('addItem') === 'true') {
      setShowAddItem(true)
    }
  }, [loading, searchParams])

  const openEdit = (item) => {
    setEditItem(item)
    setNewItem({ title: item.title || '', description: item.description || '', size: item.size || '', category: item.category || '', condition: item.condition || '' })
    setExistingImages(item.item_images?.sort((a, b) => a.order_index - b.order_index) || [])
    setNewImages([])
    setErrors({})
    setShowErrors(false)
    setShowAddItem(true)
  }

  const validate = () => {
    const e = {}
    if (!newItem.title) e.title = true
    if (!newItem.description) e.description = true
    if (!newItem.size) e.size = true
    if (!newItem.category) e.category = true
    if (!newItem.condition) e.condition = true
    if (existingImages.length === 0 && newImages.length === 0) e.images = true
    return e
  }

  const isValid = Object.keys(validate()).length === 0

  const handleAddImages = (e) => {
    const files = Array.from(e.target.files)
    setNewImages(prev => [...prev, ...files])
    e.target.value = ''
  }

  const handleRemoveNewImage = (index) => {
    setNewImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleRemoveExistingImage = async (img) => {
    await supabase.from('item_images').delete().eq('id', img.id)
    setExistingImages(prev => prev.filter(i => i.id !== img.id))
  }

  const handleSaveClick = () => {
    const e = validate()
    if (Object.keys(e).length > 0) {
      setErrors(e)
      setShowErrors(true)
      return
    }
    editItem ? handleUpdateItem() : handleAddItem()
  }

  const handleAddItem = async () => {
    setSaving(true)
    const { data: itemData } = await supabase.from('items').insert({ user_id: user.id, title: newItem.title, description: newItem.description, size: newItem.size, category: newItem.category, condition: newItem.condition }).select().single()
    if (itemData && newImages.length > 0) {
      for (let i = 0; i < newImages.length; i++) {
        const file = await compressImage(newImages[i])
        const path = `${user.id}/${itemData.id}/${Date.now()}_${file.name}`
        const { data: uploadData } = await supabase.storage.from('items').upload(path, file)
        if (uploadData) {
          const { data: urlData } = supabase.storage.from('items').getPublicUrl(path)
          await supabase.from('item_images').insert({ item_id: itemData.id, image_url: urlData.publicUrl, is_cover: i === 0, order_index: i })
        }
      }
    }
    await refreshItems()
    resetForm()
  }

  const handleUpdateItem = async () => {
    setSaving(true)
    await supabase.from('items').update({ title: newItem.title, description: newItem.description, size: newItem.size, category: newItem.category, condition: newItem.condition }).eq('id', editItem.id)
    if (newImages.length > 0) {
      const startIndex = existingImages.length
      for (let i = 0; i < newImages.length; i++) {
        const file = await compressImage(newImages[i])
        const path = `${user.id}/${editItem.id}/${Date.now()}_${file.name}`
        const { data: uploadData } = await supabase.storage.from('items').upload(path, file)
        if (uploadData) {
          const { data: urlData } = supabase.storage.from('items').getPublicUrl(path)
          await supabase.from('item_images').insert({ item_id: editItem.id, image_url: urlData.publicUrl, is_cover: startIndex === 0 && i === 0, order_index: startIndex + i })
        }
      }
    }
    await refreshItems()
    resetForm()
  }

  const refreshItems = async () => {
    const { data: itemsData } = await supabase.from('items').select('*, item_images(*)').eq('user_id', user.id).order('created_at', { ascending: false })
    setItems(itemsData || [])
  }

  const resetForm = () => {
    setNewItem({ title: '', description: '', size: '', category: '', condition: '' })
    setNewImages([])
    setExistingImages([])
    setEditItem(null)
    setErrors({})
    setShowErrors(false)
    setShowAddItem(false)
    setSaving(false)
  }

  const inputStyle = (hasError) => ({ width: '100%', padding: '14px 10px', borderRadius: '12px', border: `1.5px solid ${hasError ? 'var(--accent)' : 'var(--border)'}`, backgroundColor: 'var(--bg-input)', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontFamily: 'Inter, system-ui, sans-serif', paddingTop: '80px' }}>
      Loading...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', fontFamily: 'Inter, system-ui, sans-serif', paddingTop: '80px', paddingBottom: '40px' }}>

      {previewImage && (
        <div onClick={() => setPreviewImage(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <img src={previewImage} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '16px', objectFit: 'contain' }} />
          <div style={{ position: 'absolute', top: '24px', right: '24px', width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FFFFFF', fontSize: '18px' }}>✕</div>
        </div>
      )}

      <div style={{ margin: '24px 24px 16px', backgroundColor: 'var(--bg-card)', borderRadius: '28px', padding: '28px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '90px', height: '90px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: '36px', fontWeight: '700', overflow: 'hidden', flexShrink: 0 }}>
          {profile?.profile_image_url ? (
            <img src={profile.profile_image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: '36px', fontWeight: '700', color: '#FFFFFF', lineHeight: '90px', textAlign: 'center' }}>
              {profile?.username?.[0]?.toUpperCase()}
            </span>
          )}
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{profile?.username}</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{user?.email}</p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{profile?.city}</p>
          {profile?.bio && <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '6px' }}>{profile?.bio}</p>}
        </div>
        <Link to="/settings" className="edit-settings-btn">Edit Settings</Link>
      </div>

      <div style={{ margin: '0 24px', backgroundColor: 'var(--bg-card)', borderRadius: '28px', padding: '24px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>My Items ({items.length})</h3>
          {!showAddItem && (
            <button onClick={() => { setEditItem(null); setNewItem({ title: '', description: '', size: '', category: '', condition: '' }); setNewImages([]); setExistingImages([]); setShowAddItem(true) }} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', backgroundColor: "var(--accent)", color: "#FFFFFF", fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
              + Add
            </button>
          )}
        </div>

        {showAddItem && (
          <div style={{ backgroundColor: 'var(--bg)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>{editItem ? 'Edit Item' : 'New Item'}</h3>
              <button onClick={resetForm} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✕
              </button>
            </div>

            {showErrors && Object.keys(errors).filter(k => errors[k]).length > 0 && (
              <div style={{ backgroundColor: "var(--accent)", color: "#FFFFFF", padding: '12px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '500', marginBottom: '16px' }}>
                Please fill in all required fields.
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Photos</label>
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '20px', borderRadius: '12px', border: `1.5px dashed var(--accent)`, backgroundColor: 'var(--bg-card)', cursor: 'pointer', boxSizing: 'border-box' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span style={{ fontSize: '14px', color: 'var(--accent)', fontWeight: '600' }}>Add Photos</span>
                <input type="file" accept="image/*" multiple onChange={handleAddImages} style={{ display: 'none' }} />
              </label>

              {(existingImages.length > 0 || newImages.length > 0) && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {existingImages.map((img, i) => (
                    <div key={img.id} style={{ position: 'relative', width: '72px', height: '72px' }}>
                      <img src={img.image_url} onClick={() => setPreviewImage(img.image_url)} style={{ width: '72px', height: '72px', borderRadius: '10px', objectFit: 'cover', border: i === 0 ? '2px solid var(--accent)' : '2px solid var(--border)', cursor: 'pointer' }} />
                      <button onClick={() => handleRemoveExistingImage(img)} style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--accent)', border: 'none', color: 'white', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✕</button>
                      {i === 0 && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'var(--accent)', color: 'white', fontSize: '9px', fontWeight: '700', padding: '2px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }}>COVER</div>}
                    </div>
                  ))}
                  {newImages.map((file, i) => (
                    <div key={i} style={{ position: 'relative', width: '72px', height: '72px' }}>
                      <img src={URL.createObjectURL(file)} onClick={() => setPreviewImage(URL.createObjectURL(file))} style={{ width: '72px', height: '72px', borderRadius: '10px', objectFit: 'cover', border: existingImages.length === 0 && i === 0 ? '2px solid var(--accent)' : '2px solid var(--border)', cursor: 'pointer' }} />
                      <button onClick={() => handleRemoveNewImage(i)} style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--accent)', border: 'none', color: 'white', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Title</label>
              <input type="text" value={newItem.title} onChange={e => { setNewItem({ ...newItem, title: e.target.value }); setErrors(prev => ({ ...prev, title: false })) }} placeholder="e.g. Vintage Denim Jacket" style={inputStyle(errors.title && showErrors)} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Description</label>
              <textarea value={newItem.description} onChange={e => { setNewItem({ ...newItem, description: e.target.value }); setErrors(prev => ({ ...prev, description: false })) }} placeholder="Describe the item..." rows={3} style={{ ...inputStyle(errors.description && showErrors), resize: 'none' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Size</label>
                <div style={{ position: 'relative' }}>
                  <div onClick={() => setOpenDropdown(openDropdown === 'size' ? null : 'size')} style={{ ...inputStyle(errors.size && showErrors), cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 8px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    <span style={{ color: newItem.size ? 'var(--text-primary)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{newItem.size || '--'}</span>
                    <span style={{ fontSize: '12px' }}>▾</span>
                  </div>
                  {openDropdown === 'size' && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, minWidth: '120px', backgroundColor: 'var(--bg-input)', borderRadius: '12px', border: '1.5px solid var(--border)', zIndex: 10, overflow: 'visible', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                      {['XXS','XS','S','M','L','XL','XXL','One Size'].map(size => (
                        <div key={size} onClick={() => { setNewItem({ ...newItem, size }); setErrors(prev => ({ ...prev, size: false })); setOpenDropdown(null) }} style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', backgroundColor: newItem.size === size ? '#FFF0F0' : 'transparent', color: newItem.size === size ? 'var(--accent)' : 'var(--text-primary)', fontWeight: newItem.size === size ? '600' : '400', whiteSpace: 'nowrap' }}>
                          {size}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <div style={{ position: 'relative' }}>
                  <div onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')} style={{ ...inputStyle(errors.category && showErrors), cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 8px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    <span style={{ color: newItem.category ? 'var(--text-primary)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{newItem.category || '--'}</span>
                    <span style={{ fontSize: '12px' }}>▾</span>
                  </div>
                  {openDropdown === 'category' && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, minWidth: '120px', backgroundColor: 'var(--bg-input)', borderRadius: '12px', border: '1.5px solid var(--border)', zIndex: 10, overflow: 'visible', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                      {['Tops','Bottoms','Dresses','Outerwear','Shoes','Accessories'].map(cat => (
                        <div key={cat} onClick={() => { setNewItem({ ...newItem, category: cat }); setErrors(prev => ({ ...prev, category: false })); setOpenDropdown(null) }} style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', backgroundColor: newItem.category === cat ? '#FFF0F0' : 'transparent', color: newItem.category === cat ? 'var(--accent)' : 'var(--text-primary)', fontWeight: newItem.category === cat ? '600' : '400', whiteSpace: 'nowrap' }}>
                          {cat}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Condition</label>
                <div style={{ position: 'relative' }}>
                  <div onClick={() => setOpenDropdown(openDropdown === 'condition' ? null : 'condition')} style={{ ...inputStyle(errors.condition && showErrors), cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 8px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    <span style={{ color: newItem.condition ? 'var(--text-primary)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{newItem.condition || '--'}</span>
                    <span style={{ fontSize: '12px' }}>▾</span>
                  </div>
                  {openDropdown === 'condition' && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, minWidth: '120px', backgroundColor: 'var(--bg-input)', borderRadius: '12px', border: '1.5px solid var(--border)', zIndex: 10, overflow: 'visible', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                      {['New','Like New','Good','Fair','Worn'].map(cond => (
                        <div key={cond} onClick={() => { setNewItem({ ...newItem, condition: cond }); setErrors(prev => ({ ...prev, condition: false })); setOpenDropdown(null) }} style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', backgroundColor: newItem.condition === cond ? '#FFF0F0' : 'transparent', color: newItem.condition === cond ? 'var(--accent)' : 'var(--text-primary)', fontWeight: newItem.condition === cond ? '600' : '400', whiteSpace: 'nowrap' }}>
                          {cond}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button onClick={handleSaveClick} disabled={saving} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: isValid ? 'var(--accent)' : '#CCCCCC', color: '#FFFFFF', fontSize: '15px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Save Item'}
            </button>
          </div>
        )}

        {items.length === 0 && !showAddItem ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>No items yet. Add your first item!</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {items.filter(item => !editItem || item.id !== editItem.id).map(item => {
              const cover = item.item_images?.find(img => img.is_cover) || item.item_images?.[0]
              return (
                <div key={item.id} onClick={() => openEdit(item)} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden', border: '1.5px solid #ffd6ff', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', cursor: 'pointer' }}>
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
