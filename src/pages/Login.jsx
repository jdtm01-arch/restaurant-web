import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import Alert from '../components/ui/Alert'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const from = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      toast.success('¡Bienvenido!')
      navigate(from, { replace: true })
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Credenciales incorrectas'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__wrapper">
        {/* Logo / brand */}
        <div className="login-page__brand">
          <img src="/logo.png" alt="Tu Restaurante" className="login-page__logo" />
          <h1 className="login-page__title">Tu Restaurante</h1>
          <p className="login-page__subtitle">Sistema de Restaurante</p>
        </div>

        {/* Login card */}
        <div className="card">
          <h2 className="login-page__heading">Iniciar Sesión</h2>

          {error && <Alert variant="error">{error}</Alert>}

          <form onSubmit={handleSubmit} className="login-page__form">
            <div>
              <label htmlFor="email" className="label">Correo electrónico</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">Contraseña</label>
              <div className="login-page__password-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="login-page__toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="sidebar__link-icon" /> : <Eye className="sidebar__link-icon" />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-page__submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner size="sm" />
                  Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        <div className="login-page__demo">
          <p className="login-page__demo-title">Credenciales de demo</p>
          <div className="login-page__demo-credentials">
            <div className="login-page__demo-row">
              <span className="login-page__demo-label">Email:</span>
              <code className="login-page__demo-value">super-admin@turestaurante.com</code>
            </div>
            <div className="login-page__demo-row">
              <span className="login-page__demo-label">Contraseña:</span>
              <code className="login-page__demo-value">admin1234</code>
            </div>
          </div>
          <button
            type="button"
            className="login-page__demo-fill"
            onClick={() => {
              setEmail('super-admin@turestaurante.com')
              setPassword('admin1234')
            }}
          >
            Usar credenciales demo
          </button>
        </div>
      </div>
    </div>
  )
}
