import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  TrendingUp, ShoppingBag, LayoutGrid, Receipt,
  RefreshCw, AlertCircle, ClipboardList,
} from 'lucide-react'
import { dashboardApi } from '../api/dashboard'
import { useAuth } from '../context/AuthContext'

/* ── Palette for pie chart slices ─────────────────────────── */
const PIE_COLORS = [
  '#f59b20', '#3b82f6', '#10b981', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
]

/* ── Stat card config ─────────────────────────────────────── */
const STAT_CARDS = [
  {
    key: 'total_sales_today',
    label: 'Ventas del Turno',
    icon: TrendingUp,
    format: 'money',
    gradient: 'from-amber-500 to-orange-600',
    glow: 'rgba(245,155,32,0.35)',
  },
  {
    key: 'active_orders',
    label: 'Pedidos Activos',
    icon: ShoppingBag,
    format: 'number',
    gradient: 'from-blue-500 to-indigo-600',
    glow: 'rgba(59,130,246,0.35)',
  },
  {
    key: 'occupancy_pct',
    label: 'Ocupación de Mesas',
    icon: LayoutGrid,
    format: 'percent',
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'rgba(16,185,129,0.35)',
  },
  {
    key: 'total_expenses_today',
    label: 'Gastos del Día',
    icon: Receipt,
    format: 'money',
    gradient: 'from-rose-500 to-pink-600',
    glow: 'rgba(239,68,68,0.35)',
  },
]

function fmtMoney(v) {
  return `S/ ${Number(v || 0).toFixed(2)}`
}

function fmtValue(v, format) {
  if (format === 'money')   return fmtMoney(v)
  if (format === 'percent') return `${v}%`
  return String(v ?? 0)
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="db-tooltip">
      <p className="db-tooltip__label">{label}</p>
      <p className="db-tooltip__value">{fmtMoney(payload[0]?.value)}</p>
    </div>
  )
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="db-tooltip">
      <p className="db-tooltip__label">{item.name}</p>
      <p className="db-tooltip__value">{fmtMoney(item.value)}</p>
      <p className="db-tooltip__sub">{item.payload.percentage}% del total</p>
    </div>
  )
}

function PieLabel({ cx, cy, midAngle, outerRadius, name, percentage }) {
  if (percentage < 6) return null
  const RADIAN = Math.PI / 180
  const r = outerRadius + 24
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"
      style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }}>
      {name} {percentage}%
    </text>
  )
}

export default function Dashboard() {
  const { user, currentRole } = useAuth()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [spin, setSpin]       = useState(false)

  const isAdmin = ['admin_general', 'admin_restaurante'].includes(currentRole)

  const isMozo = currentRole === 'mozo'

  const load = useCallback(async () => {
    if (!isAdmin && !isMozo) return
    setLoading(true)
    setError(null)
    try {
      if (isAdmin) {
        const res = await dashboardApi.summary()
        setData(res.data.data)
      } else if (isMozo) {
        const res = await dashboardApi.waiter()
        setData(res.data.data)
      }
    } catch {
      setError('No se pudo cargar el dashboard.')
    } finally {
      setLoading(false)
    }
  }, [isAdmin, isMozo])

  useEffect(() => { load() }, [load])

  /* Auto-refresh every 60 s */
  useEffect(() => {
    if (!isAdmin && !isMozo) return
    const timer = setInterval(load, 60_000)
    return () => clearInterval(timer)
  }, [isAdmin, isMozo, load])

  const handleRefresh = () => {
    setSpin(true)
    load().finally(() => setTimeout(() => setSpin(false), 700))
  }

  if (!isAdmin && !isMozo) {
    return (
      <div className="db-welcome">
        <h1 className="page-title">Bienvenido, {user?.name}</h1>
        <p className="page-subtitle">Usa el menú lateral para acceder a tu módulo.</p>
      </div>
    )
  }

  /* ── Mozo Dashboard ── */
  if (isMozo) {
    if (loading && !data) {
      return (
        <div className="db-root">
          <div className="db-header">
            <div><div className="db-skeleton db-skeleton--title" /><div className="db-skeleton db-skeleton--sub" /></div>
          </div>
          <div className="db-cards-grid">
            {[0,1,2].map(i => (
              <div key={i} className="db-skeleton db-skeleton--card" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="db-root">
          <div className="db-error">
            <AlertCircle size={32} className="db-error__icon" />
            <p>{error}</p>
            <button className="btn-primary" onClick={load}>Reintentar</button>
          </div>
        </div>
      )
    }

    const channelLabel = (ch) => ({ dine_in: 'Salón', takeaway: 'Para llevar', delivery: 'Delivery' }[ch] || ch)
    const statusLabel = (s) => ({ open: 'Abierta', closed: 'Cerrada', paid: 'Pagada', cancelled: 'Cancelada' }[s] || s)
    const statusCss = (s) => ({ open: 'badge--success', closed: 'badge--warning', paid: 'badge--primary', cancelled: 'badge--danger' }[s] || 'badge--muted')
    const fmtTime = (v) => v ? new Date(v).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'

    return (
      <div className="db-root">
        <div className="db-header">
          <div>
            <h1 className="page-title">Mi Turno</h1>
            <p className="page-subtitle">Hola {user?.name} — {data?.today ? new Date(data.today + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }) : '—'}</p>
          </div>
          <button className="btn-secondary db-refresh-btn" onClick={handleRefresh} title="Actualizar">
            <RefreshCw size={15} className={spin ? 'db-spin' : ''} />
            Actualizar
          </button>
        </div>

        {/* KPI cards */}
        <div className="db-cards-grid">
          <div className="db-card" style={{ '--glow': 'rgba(245,155,32,0.35)' }}>
            <div className="db-card__bg bg-gradient-to-br from-amber-500 to-orange-600" />
            <div className="db-card__shine" />
            <div className="db-card__content">
              <div className="db-card__icon-wrap"><TrendingUp size={22} strokeWidth={2} /></div>
              <div className="db-card__body">
                <p className="db-card__label">Mis Ventas del Turno</p>
                <p className="db-card__value">{fmtMoney(data?.total_sales)}</p>
                <p className="db-card__sub">{data?.sales_count ?? 0} ventas</p>
              </div>
            </div>
          </div>
          <div className="db-card" style={{ animationDelay: '0.08s', '--glow': 'rgba(59,130,246,0.35)' }}>
            <div className="db-card__bg bg-gradient-to-br from-blue-500 to-indigo-600" />
            <div className="db-card__shine" />
            <div className="db-card__content">
              <div className="db-card__icon-wrap"><ShoppingBag size={22} strokeWidth={2} /></div>
              <div className="db-card__body">
                <p className="db-card__label">Pedidos Activos</p>
                <p className="db-card__value">{data?.active_orders_count ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="db-card" style={{ animationDelay: '0.16s', '--glow': 'rgba(16,185,129,0.35)' }}>
            <div className="db-card__bg bg-gradient-to-br from-emerald-500 to-teal-600" />
            <div className="db-card__shine" />
            <div className="db-card__content">
              <div className="db-card__icon-wrap"><ClipboardList size={22} strokeWidth={2} /></div>
              <div className="db-card__body">
                <p className="db-card__label">Pedidos del Día</p>
                <p className="db-card__value">{data?.today_orders_count ?? 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active orders */}
        {data?.active_orders?.length > 0 && (
          <div className="db-chart-card mt-4">
            <p className="db-chart-card__title">Pedidos Activos</p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">ID</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Mesa</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Canal</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Estado</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Items</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-600">Total</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.active_orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{o.id}</td>
                      <td className="px-3 py-2">{o.table_name}</td>
                      <td className="px-3 py-2">{channelLabel(o.channel)}</td>
                      <td className="px-3 py-2"><span className={statusCss(o.status)}>{statusLabel(o.status)}</span></td>
                      <td className="px-3 py-2">{o.items_count}</td>
                      <td className="px-3 py-2 text-right font-medium">{fmtMoney(o.total)}</td>
                      <td className="px-3 py-2">{fmtTime(o.opened_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Today's orders */}
        <div className="db-chart-card mt-4">
          <p className="db-chart-card__title">Mis Pedidos del Día</p>
          {data?.today_orders?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">ID</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Mesa</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Canal</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Estado</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Items</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-600">Total</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.today_orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{o.id}</td>
                      <td className="px-3 py-2">{o.table_name}</td>
                      <td className="px-3 py-2">{channelLabel(o.channel)}</td>
                      <td className="px-3 py-2"><span className={statusCss(o.status)}>{statusLabel(o.status)}</span></td>
                      <td className="px-3 py-2">{o.items_count}</td>
                      <td className="px-3 py-2 text-right font-medium">{fmtMoney(o.total)}</td>
                      <td className="px-3 py-2">{fmtTime(o.opened_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="db-empty">No tienes pedidos hoy.</p>
          )}
        </div>
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="db-root">
        <div className="db-header">
          <div>
            <div className="db-skeleton db-skeleton--title" />
            <div className="db-skeleton db-skeleton--sub" />
          </div>
        </div>
        <div className="db-cards-grid">
          {[0,1,2,3].map(i => (
            <div key={i} className="db-skeleton db-skeleton--card" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        <div className="db-charts-grid">
          <div className="db-skeleton db-skeleton--chart" />
          <div className="db-skeleton db-skeleton--chart" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="db-root">
        <div className="db-error">
          <AlertCircle size={32} className="db-error__icon" />
          <p>{error}</p>
          <button className="btn-primary" onClick={load}>Reintentar</button>
        </div>
      </div>
    )
  }

  const today = data?.today
    ? new Date(data.today + 'T12:00:00').toLocaleDateString('es-PE', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—'

  const weeklySales = data?.weekly_sales     || []
  const salesByCat  = data?.sales_by_category || []

  return (
    <div className="db-root">
      {/* Header */}
      <div className="db-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle" style={{ textTransform: 'capitalize' }}>{today}</p>
        </div>
        <button className="btn-secondary db-refresh-btn" onClick={handleRefresh} title="Actualizar">
          <RefreshCw size={15} className={spin ? 'db-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* KPI cards */}
      <div className="db-cards-grid">
        {STAT_CARDS.map((cfg, idx) => {
          const Icon       = cfg.icon
          const value      = data?.[cfg.key] ?? 0
          const extraLabel = cfg.key === 'occupancy_pct'
            ? `${data?.occupied_tables ?? 0} / ${data?.total_tables ?? 0} mesas`
            : null

          return (
            <div
              key={cfg.key}
              className="db-card"
              style={{ animationDelay: `${idx * 0.08}s`, '--glow': cfg.glow }}
            >
              <div className={`db-card__bg bg-gradient-to-br ${cfg.gradient}`} />
              <div className="db-card__shine" />
              <div className="db-card__content">
                <div className="db-card__icon-wrap">
                  <Icon size={22} strokeWidth={2} />
                </div>
                <div className="db-card__body">
                  <p className="db-card__label">{cfg.label}</p>
                  <p className="db-card__value">{fmtValue(value, cfg.format)}</p>
                  {extraLabel && <p className="db-card__sub">{extraLabel}</p>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="db-charts-grid">

        {/* Bar chart: weekly sales */}
        <div className="db-chart-card">
          <p className="db-chart-card__title">Ventas — Últimos 7 días</p>
          {weeklySales.length === 0 ? (
            <p className="db-empty">Sin datos de la semana.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklySales} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `S/${v}`} width={58} />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(245,155,32,0.07)' }} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {weeklySales.map((entry, i) => (
                    <Cell key={i} fill={entry.label === 'Hoy' ? '#f59b20' : '#fed7aa'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart: sales by category */}
        <div className="db-chart-card">
          <p className="db-chart-card__title">Ventas por Categoría — Hoy</p>
          {salesByCat.length === 0 ? (
            <p className="db-empty">Sin ventas registradas hoy.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={salesByCat}
                  dataKey="total"
                  nameKey="category_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={88}
                  innerRadius={40}
                  paddingAngle={3}
                  labelLine={false}
                  label={<PieLabel />}
                >
                  {salesByCat.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 12, color: '#374151' }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  )
}

