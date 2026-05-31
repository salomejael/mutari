import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function AuthGuard({ children }) {
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        navigate('/')
      }
      setChecking(false)
    }
    checkAuth()
  }, [])

  if (checking) return null
  return children
}
