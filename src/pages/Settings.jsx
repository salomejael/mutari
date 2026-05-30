import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

function MapUpdater({ latitude, longitude }) {
  const map = useMapEvents({})
  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom())
  }, [latitude, longitude])
  return null
}

export default function Settings() {
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('')
  const [city, setCity] = useState('')
  const [latitude, setLatitude] = useState(47.3769)
  const [longitude, setLongitude] = useState(8.5417)
  const [searchRadius, setSearchRadius] = useState(50)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [currentAvatar, setCurrentAvatar] = useState(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [locating, setLocating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      if (data.user) {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
        if (profileData) {
          setUsername(profileData.username || '')
          setCity(profileData.city || '')
          setCurrentAvatar(profileData.profile_image_url || null)
          setSearchRadius(profileData.search_radius_km || 50)
          if (profileData.latitude) setLatitude(profileData.latitude)
          if (profileData.longitude) setLongitude(profileData.longitude)
        }
      }
    }
    fetchData()
  }, [])

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleGPS = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude
      const lon = pos.coords.longitude
      setLatitude(lat)
      setLongitude(lon)
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
      const data = await res.json()
      const cityName = data.address?.city || data.address?.town || data.address?.village || ''
      setCity(cityName)
      setLocating(false)
    }, () => {
      alert('Could not get location. Please enable location access.')
      setLocating(false)
    })
  }

  const handleMapClick = async (lat, lon) => {
    setLatitude(lat)
    setLongitude(lon)
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
    const data = await res.json()
    const cityName = data.address?.city || data.address?.town || data.address?.village || ''
    setCity(cityName)
  }

  const handleCityEnter = async (e) => {
    if (e.key === 'Enter') {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`)
      const data = await res.json()
      if (data.length > 0) {
        setLatitude(parseFloat(data[0].lat))
        setLongitude(parseFloat(data[0].lon))
      }
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSuccess(false)
    let profile_image_url = currentAvatar

    if (avatarFile) {
      const path = `${user.id}/avatar`
      await supabase.storage.from('avatars').remove([path])
      const { data: uploadData, error: uploadError } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        profile_image_url = urlData.publicUrl + '?t=' + Date.now()
      } else {
        console.error('Upload error:', uploadError)
      }
    }

    await supabase.from('profiles').update({ username, city, latitude, longitude, search_radius_km: searchRadius, profile_image_url }).eq('id', user.id)
    setSaving(false)
    setSuccess(true)
    setTimeout(() => navigate('/profile'), 1000)
  }

  const hasImage = avatarPreview || currentAvatar
  const inputStyle = { width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1.5px solid var(--border)', backgroundColor: 'var(--bg-input)', fontSize: '15px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', fontFamily: 'Inter, system-ui, sans-serif', paddingTop: '80px', paddingBottom: '40px' }}>
      <div style={{ margin: '24px 24px 16px', backgroundColor: 'var(--bg-card)', borderRadius: '28px', padding: '28px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>

        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <div style={{ position: 'relative' }}>
            <label style={{ cursor: 'pointer' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: '40px', fontWeight: '700', overflow: 'hidden' }}>
                {hasImage ? (
                  <img src={avatarPreview || currentAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: '40px', fontWeight: '700', color: '#FFFFFF', lineHeight: '100px', textAlign: 'center' }}>
                    {username?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            </label>
            {!hasImage && (
              <label style={{ position: 'absolute', bottom: '0', right: '0', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#FFFFFF', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--accent)', fontSize: '20px', fontWeight: '400', lineHeight: '1', paddingBottom: '1px', boxSizing: 'border-box' }}>
                +
                <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </label>
            )}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tap to change your photo</p>
        </div>

        {/* Username */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Username</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="yourname" style={inputStyle} />
        </div>

        {/* City */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>City</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" value={city} onChange={e => setCity(e.target.value)} onKeyDown={handleCityEnter} placeholder="Zurich" style={{ ...inputStyle, flex: 1 }} />
            <button onClick={handleGPS} disabled={locating} style={{ padding: '14px 20px', borderRadius: '12px', border: '1.5px solid var(--border)', backgroundColor: 'var(--bg-input)', cursor: 'pointer', flexShrink: 0, color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '700', fontFamily: 'Inter, system-ui, sans-serif' }}>
              {locating ? '...' : 'GPS'}
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>Press Enter to search or tap GPS</p>
        </div>

        {/* Map */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Your Location</label>
          <div style={{ borderRadius: '16px', overflow: 'hidden', height: '200px' }}>
            <MapContainer center={[latitude, longitude]} zoom={10} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
              <MapClickHandler onLocationSelect={handleMapClick} />
              <MapUpdater latitude={latitude} longitude={longitude} />
              <Marker position={[latitude, longitude]} />
              <Circle
                center={[latitude, longitude]}
                radius={searchRadius * 1000}
                pathOptions={{ color: '#B91C1C', fillColor: '#ffd6ff', fillOpacity: 0.4, weight: 2 }}
              />
            </MapContainer>
          </div>
        </div>

        {/* Search Radius */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Search Radius: {searchRadius} km</label>
          <input type="range" min="5" max="50" value={searchRadius} onChange={e => setSearchRadius(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            <span>5 km</span>
            <span>50 km</span>
          </div>
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', backgroundColor: 'var(--accent)', color: '#FFFFFF', fontSize: '15px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        {success && (
          <p style={{ textAlign: 'center', fontSize: '14px', fontWeight: '500', color: 'var(--accent)', marginTop: '12px' }}>
            Saved successfully!
          </p>
        )}
      </div>
    </div>
  )
}
