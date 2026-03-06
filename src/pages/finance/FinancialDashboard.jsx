import { useState, useEffect, useCallback } from 'react'
import { financialAccountsApi } from '../../api/financialAccounts'
import { financialMovementsApi } from '../../api/financialMovements'
import DataTable from '../../components/ui/DataTable'
import Spinner from '../../components/ui/Spinner'
import { Wallet, Building2, Smartphone, CreditCard, TrendingUp, TrendingDown, ArrowRightLeft, RefreshCw, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'

const fmtMoney = (v) => v != null ? `S/ ${Number(v).toFixed(2)}` : 'S/ 0.00'

const TYPE_ICONS = {
  cash: Wallet,
  bank: Building2,
  digital: Smartphone,
  pos: CreditCard,
}
const TYPE_LABELS = { cash: 'Efectivo', bank: 'Banco', digital: 'Digital', pos: 'POS' }

const TYPE_STYLES = {
  cash:    { gradient: 'from-amber-500 to-orange-600',   glow: 'rgba(245,155,32,0.35)' },
  bank:    { gradient: 'from-blue-500 to-indigo-600',    glow: 'rgba(59,130,246,0.35)' },
  digital: { gradient: 'from-emerald-500 to-teal-600',   glow: 'rgba(16,185,129,0.35)' },
  pos:     { gradient: 'from-violet-500 to-purple-600',  glow: 'rgba(139,92,246,0.35)' },
}

const MOVEMENT_TYPE_LABELS = {
  income: 'Ingreso',
  expense: 'Egreso',
  transfer_in: 'Transferencia entrada',
  transfer_out: 'Transferencia salida',
  initial_balance: 'Saldo Inicial',
}

const REFERENCE_TYPE_LABELS = {
  sale_payment: 'Pago de venta',
  expense_payment: 'Pago de gasto',
  transfer: 'Transferencia',
  manual_adjustment: 'Ajuste manual',
  initial_balance: 'Registro Inicial',
}

const fmtDateTime = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  return d.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}

const today = new Date().toISOString().slice(0, 10)

export default function FinancialDashboard() {
  const [balances, setBalances] = useState(null)
  const [loadingBalances, setLoadingBalances] = useState(true)
  const [movements, setMovements] = useState([])
  const [loadingMovements, setLoadingMovements] = useState(true)
  const [accounts, setAccounts] = useState([])
  const [spin, setSpin] = useState(false)

  // Filters
  const [filterAccount, setFilterAccount] = useState('')
  const [filterType, setFilterType] = useState('')
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)

  const fetchBalances = useCallback(async () => {
    setLoadingBalances(true)
    try {
      const res = await financialAccountsApi.balances()
      setBalances(res.data.data)
    } catch {
      toast.error('Error al cargar saldos')
    } finally {
      setLoadingBalances(false)
    }
  }, [])

  const fetchMovements = useCallback(async () => {
    setLoadingMovements(true)
    try {
      const params = { date_from: dateFrom, date_to: dateTo }
      if (filterAccount) params.financial_account_id = filterAccount
      if (filterType) params.type = filterType
      const res = await financialMovementsApi.list(params)
      setMovements(res.data.data || [])
    } catch {
      toast.error('Error al cargar movimientos')
    } finally {
      setLoadingMovements(false)
    }
  }, [dateFrom, dateTo, filterAccount, filterType])

  useEffect(() => {
    fetchBalances()
    financialAccountsApi.list().then((r) => setAccounts(r.data.data || [])).catch(() => {})
  }, [fetchBalances])

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  const handleRefresh = () => {
    setSpin(true)
    Promise.all([fetchBalances(), fetchMovements()])
      .finally(() => setTimeout(() => setSpin(false), 700))
  }

  const movementColumns = [
    { key: 'id', label: 'ID', className: 'w-12' },
    {
      key: 'financial_account',
      label: 'Cuenta',
      render: (row) => row.financial_account?.name || '—',
    },
    {
      key: 'type',
      label: 'Tipo',
      className: 'w-36',
      render: (row) => {
        const isPositive = ['income', 'transfer_in', 'initial_balance'].includes(row.type)
        return (
          <span className={isPositive ? 'badge--success' : 'badge--danger'}>
            {MOVEMENT_TYPE_LABELS[row.type] || row.type}
          </span>
        )
      },
    },
    {
      key: 'reference_type',
      label: 'Origen',
      render: (row) => REFERENCE_TYPE_LABELS[row.reference_type] || row.reference_type || '—',
    },
    {
      key: 'amount',
      label: 'Monto',
      className: 'w-28 text-right',
      render: (row) => {
        const isPositive = ['income', 'transfer_in', 'initial_balance'].includes(row.type)
        return (
          <span style={{ color: isPositive ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
            {isPositive ? '+' : '-'}{fmtMoney(row.amount)}
          </span>
        )
      },
    },
    { key: 'description', label: 'Descripción', render: (row) => row.description || '—' },
    {
      key: 'creator',
      label: 'Usuario',
      render: (row) => row.creator?.name || '—',
    },
    {
      key: 'created_at',
      label: 'Fecha',
      className: 'w-36',
      render: (row) => fmtDateTime(row.created_at),
    },
  ]

  return (
    <div className="db-root">
      {/* Header */}
      <div className="db-header">
        <div>
          <h1 className="page-title">Dashboard Financiero</h1>
          <p className="page-subtitle">Saldos consolidados y movimientos de todas las cuentas</p>
        </div>
        <button className="btn-secondary db-refresh-btn" onClick={handleRefresh} title="Actualizar">
          <RefreshCw size={15} className={spin ? 'db-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Balance Cards */}
      {loadingBalances ? (
        <div className="db-cards-grid">
          {[0,1,2,3].map(i => (
            <div key={i} className="db-skeleton db-skeleton--card" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      ) : balances && (
        <>
          {/* Total consolidado — hero card */}
          <div className="db-card" style={{ '--glow': 'rgba(245,155,32,0.35)' }}>
            <div className="db-card__bg bg-gradient-to-br from-gray-800 to-gray-900" />
            <div className="db-card__shine" />
            <div className="db-card__content">
              <div className="db-card__icon-wrap">
                <DollarSign size={26} strokeWidth={2} />
              </div>
              <div className="db-card__body">
                <p className="db-card__label">Saldo Total Consolidado</p>
                <p className="db-card__value" style={{ fontSize: '1.75rem' }}>{fmtMoney(balances.total)}</p>
                <p className="db-card__sub">{balances.accounts?.length || 0} cuentas activas</p>
              </div>
            </div>
          </div>

          {/* Cards by account type */}
          <div className="db-cards-grid">
            {Object.entries(balances.by_type || {}).map(([type, amount], idx) => {
              const Icon = TYPE_ICONS[type] || Wallet
              const style = TYPE_STYLES[type] || TYPE_STYLES.cash
              return (
                <div
                  key={type}
                  className="db-card"
                  style={{ animationDelay: `${idx * 0.08}s`, '--glow': style.glow }}
                >
                  <div className={`db-card__bg bg-gradient-to-br ${style.gradient}`} />
                  <div className="db-card__shine" />
                  <div className="db-card__content">
                    <div className="db-card__icon-wrap">
                      <Icon size={22} strokeWidth={2} />
                    </div>
                    <div className="db-card__body">
                      <p className="db-card__label">{TYPE_LABELS[type] || type}</p>
                      <p className="db-card__value">{fmtMoney(amount)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Individual accounts */}
          {balances.accounts && balances.accounts.length > 0 && (
            <div className="db-chart-card">
              <p className="db-chart-card__title">Saldo por Cuenta</p>
              <div>
                {balances.accounts.map((acc, i) => {
                  const Icon = TYPE_ICONS[acc.type] || Wallet
                  const style = TYPE_STYLES[acc.type] || TYPE_STYLES.cash
                  const maxBalance = Math.max(...balances.accounts.map(a => Math.abs(a.balance)), 1)
                  const pct = Math.max((Math.abs(acc.balance) / maxBalance) * 100, 2)
                  return (
                    <div key={acc.id} className="flex items-center justify-between group" style={{
                      padding: '0.75rem 1rem',
                      borderBottom: i < balances.accounts.length - 1 ? '1px solid #f3f4f6' : 'none',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div className="flex items-center gap-3" style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '0.5rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: `linear-gradient(135deg, ${style.glow}, transparent)`,
                        }}>
                          <Icon size={16} style={{ color: '#374151' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="flex items-center gap-2">
                            <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{acc.name}</span>
                            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                              {TYPE_LABELS[acc.type] || acc.type}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div style={{ marginTop: 4, height: 4, borderRadius: 2, backgroundColor: '#f3f4f6', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${pct}%`,
                              borderRadius: 2,
                              background: `linear-gradient(90deg, ${style.glow.replace('0.35', '0.8')}, ${style.glow.replace('0.35', '0.4')})`,
                              transition: 'width 0.5s ease',
                            }} />
                          </div>
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', marginLeft: '1rem', color: acc.balance >= 0 ? '#059669' : '#dc2626' }}>
                        {fmtMoney(acc.balance)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Movements section */}
      <div className="db-chart-card">
        <p className="db-chart-card__title">Movimientos Financieros</p>
        <div className="flex items-center gap-4 flex-wrap" style={{ marginBottom: '1rem' }}>
          <div>
            <label className="label" style={{ fontSize: '0.7rem' }}>Desde</label>
            <input
              type="date"
              className="input"
              style={{ fontSize: '0.8rem' }}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="label" style={{ fontSize: '0.7rem' }}>Hasta</label>
            <input
              type="date"
              className="input"
              style={{ fontSize: '0.8rem' }}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div>
            <label className="label" style={{ fontSize: '0.7rem' }}>Cuenta</label>
            <select
              className="input"
              style={{ fontSize: '0.8rem' }}
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
            >
              <option value="">Todas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" style={{ fontSize: '0.7rem' }}>Tipo</label>
            <select
              className="input"
              style={{ fontSize: '0.8rem' }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="income">Ingreso</option>
              <option value="expense">Egreso</option>
              <option value="transfer_in">Transferencia entrada</option>
              <option value="transfer_out">Transferencia salida</option>
            </select>
          </div>
        </div>
      </div>

      <div className="db-chart-card" style={{ fontSize: '0.72rem' }}>
        <DataTable columns={movementColumns} data={movements} loading={loadingMovements} emptyMessage="No hay movimientos para el rango seleccionado" />
      </div>
    </div>
  )
}
