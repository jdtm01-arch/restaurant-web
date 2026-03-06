import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  // Validate session on mount
  useEffect(() => {
    if (token) {
      authApi.me()
        .then((res) => {
          const userData = res.data.data || res.data
          setUser(userData)
          localStorage.setItem('user', JSON.stringify(userData))
        })
        .catch(() => {
          // Token invalid — clean up
          logout()
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password })
    const data = res.data

    const newToken = data.token || data.data?.token
    const userData = data.user || data.data?.user

    if (!newToken) throw new Error('No se recibió token')

    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(userData))

    // Auto-select first restaurant if user has restaurants
    if (userData.restaurants?.length > 0) {
      localStorage.setItem('restaurant_id', userData.restaurants[0].id)
    }

    setToken(newToken)
    setUser(userData)

    return userData
  }, [])

  const logout = useCallback(async () => {
    try {
      if (token) await authApi.logout()
    } catch {
      // ignore errors on logout
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('restaurant_id')
      setToken(null)
      setUser(null)
    }
  }, [token])

  const isAuthenticated = !!token && !!user

  // Derive current role from selected restaurant
  const currentRole = (() => {
    if (!user?.restaurants?.length) return null
    const restaurantId = localStorage.getItem('restaurant_id')
    const selected = restaurantId
      ? user.restaurants.find((r) => String(r.id) === String(restaurantId))
      : null
    const restaurant = selected || user.restaurants[0]
    return restaurant?.pivot?.role?.slug || null
  })()

  const hasRole = useCallback(
    (...roles) => roles.includes(currentRole),
    [currentRole]
  )

  const isAdmin = hasRole('admin_general', 'admin_restaurante')

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        currentRole,
        hasRole,
        isAdmin,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
