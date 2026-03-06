import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// ── Request interceptor: inject token + restaurant header ──
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  const restaurantId = localStorage.getItem('restaurant_id')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (restaurantId) {
    config.headers['X-Restaurant-Id'] = restaurantId
  }

  // Let the browser set Content-Type automatically for FormData
  // (it needs to include the multipart boundary)
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

  return config
})

// ── Response interceptor: handle errors globally ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const rawMessage = error.response?.data?.error
    const message = typeof rawMessage === 'string'
      ? rawMessage
      : rawMessage?.message || error.response?.data?.message || null

    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('restaurant_id')
      window.location.href = '/login'
    } else if (status === 403) {
      const errorCode = error.response?.data?.error?.code
      // Let pages handle financial initialization errors themselves
      if (errorCode !== 'FINANCIAL_NOT_INITIALIZED') {
        toast.error(message || 'No tienes permiso para realizar esta acción')
      }
    } else if (status === 422) {
      // Validation errors — let the caller handle them
    } else if (status === 500) {
      toast.error('Error interno del servidor')
    } else if (!error.response) {
      toast.error('Error de conexión con el servidor')
    }

    return Promise.reject(error)
  }
)

export default api
