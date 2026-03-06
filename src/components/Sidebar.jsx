import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  Users,
  Tag,
  ShoppingBag,
  Grid3X3,
  Truck,
  CreditCard,
  Wallet,
  Monitor,
  ClipboardList,
  Receipt,
  Lock,
  DollarSign,
  BarChart3,
  FileSearch,
  Landmark,
  ArrowRightLeft,
  PieChart,
  Settings,
} from 'lucide-react'

const allRoles = ['admin_general', 'admin_restaurante', 'caja', 'mozo', 'cocina']
const adminRoles = ['admin_general', 'admin_restaurante']
const operationRoles = ['admin_general', 'admin_restaurante', 'caja']
const orderRoles = ['admin_general', 'admin_restaurante', 'caja', 'mozo']

const navItems = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: LayoutDashboard,
    roles: allRoles,
  },
  {
    section: 'Operaciones',
    roles: [...new Set([...operationRoles, ...orderRoles])],
    items: [
      { label: 'Caja', to: '/cash-registers', icon: Monitor, roles: operationRoles },
      { label: 'Pedidos', to: '/orders', icon: ClipboardList, roles: orderRoles },
      { label: 'Ventas', to: '/sales', icon: Receipt, roles: operationRoles },
      { label: 'Cierre de Caja', to: '/cash-closings', icon: Lock, roles: operationRoles },
    ],
  },
  {
    section: 'Configuración',
    roles: adminRoles,
    items: [
      { label: 'Usuarios', to: '/admin/users', icon: Users },
      { label: 'Cat. Productos', to: '/admin/product-categories', icon: Tag },
      { label: 'Productos', to: '/admin/products', icon: ShoppingBag },
      { label: 'Mesas', to: '/admin/tables', icon: Grid3X3 },
      { label: 'Proveedores', to: '/admin/suppliers', icon: Truck },
      { label: 'Cat. Gastos', to: '/admin/expense-categories', icon: Wallet },
      { label: 'Métodos Pago', to: '/admin/payment-methods', icon: CreditCard },
    ],
  },
  {
    section: 'Control',
    roles: adminRoles,
    items: [
      { label: 'Gastos', to: '/admin/expenses', icon: DollarSign, roles: adminRoles },
      { label: 'Reportes', to: '/admin/reports', icon: BarChart3, roles: adminRoles },
      { label: 'Auditoría', to: '/admin/audit-logs', icon: FileSearch, roles: ['admin_general'] },
    ],
  },
  {
    section: 'Finanzas',
    roles: adminRoles,
    items: [
      { label: 'Dashboard', to: '/finance/dashboard', icon: PieChart, roles: adminRoles },
      { label: 'Cuentas', to: '/finance/accounts', icon: Landmark, roles: adminRoles },
      { label: 'Transferencias', to: '/finance/transfers', icon: ArrowRightLeft, roles: adminRoles },
      { label: 'Inicialización', to: '/finance/initialization', icon: Settings, roles: adminRoles },
    ],
  },
]

function linkClasses({ isActive }) {
  return `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
}

export default function Sidebar({ open, onClose }) {
  const { hasRole } = useAuth()

  return (
    <>
      {/* Overlay on mobile */}
      {open && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>
        {/* Brand */}
        <div className="sidebar__brand">
          <img src="/logo.png" alt="Tu Restaurante" className="sidebar__logo" />
          <div>
            <p className="sidebar__brand-name">Tu Restaurante</p>
            <p className="sidebar__brand-sub">Restaurante</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar__nav">
          {navItems.map((item, idx) => {
            // Single top-level link
            if (item.to) {
              if (!hasRole(...item.roles)) return null
              const Icon = item.icon
              return (
                <NavLink key={item.to} to={item.to} className={linkClasses} onClick={onClose}>
                  <Icon className="sidebar__link-icon" />
                  {item.label}
                </NavLink>
              )
            }

            // Section with sub-links
            if (item.section) {
              if (!hasRole(...item.roles)) return null
              const visibleItems = item.items.filter(
                (sub) => !sub.roles || hasRole(...sub.roles)
              )
              if (visibleItems.length === 0) return null
              return (
                <div key={idx} className="sidebar__section">
                  <p className="sidebar__section-title">{item.section}</p>
                  {visibleItems.map((sub) => {
                    const SubIcon = sub.icon
                    return (
                      <NavLink key={sub.to} to={sub.to} className={linkClasses} onClick={onClose}>
                        <SubIcon className="sidebar__link-icon" />
                        {sub.label}
                      </NavLink>
                    )
                  })}
                </div>
              )
            }

            return null
          })}
        </nav>
      </aside>
    </>
  )
}
