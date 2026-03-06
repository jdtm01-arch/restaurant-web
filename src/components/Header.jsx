import { useAuth } from '../context/AuthContext'
import { LogOut, User, Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import ConfirmDialog from './ui/ConfirmDialog'
import toast from 'react-hot-toast'

export default function Header({ onToggleSidebar }) {
  const { user, currentRole, logout } = useAuth()
  const navigate = useNavigate()
  const [logoutConfirm, setLogoutConfirm] = useState(false)

  const handleLogout = async () => {
    await logout()
    toast.success('Sesión cerrada')
    navigate('/login')
  }

  const roleLabels = {
    admin_general: 'Admin General',
    admin_restaurante: 'Admin Restaurante',
    caja: 'Cajero',
    mozo: 'Mozo',
    cocina: 'Cocina',
  }

  return (
    <header className="header">
      <div className="header__left">
        <button className="header__hamburger" onClick={onToggleSidebar} aria-label="Menú">
          <Menu className="header__logout-icon" />
        </button>
      </div>

      <div className="header__right">
        {/* Role badge */}
        <span className="header__role-badge">
          {roleLabels[currentRole] || currentRole}
        </span>

        {/* User info */}
        <div className="header__user">
          <div className="header__avatar">
            <User className="header__avatar-icon" />
          </div>
          <span className="header__user-name">{user?.name}</span>
        </div>

        {/* Logout */}
        <button onClick={() => setLogoutConfirm(true)} className="header__logout" title="Cerrar sesión">
          <LogOut className="header__logout-icon" />
        </button>
      </div>

      <ConfirmDialog
        open={logoutConfirm}
        onClose={() => setLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Cerrar Sesión"
        message="¿Estás seguro de que deseas cerrar sesión?"
        confirmText="Sí, cerrar sesión"
        cancelText="Cancelar"
        variant="primary"
      />
    </header>
  )
}
