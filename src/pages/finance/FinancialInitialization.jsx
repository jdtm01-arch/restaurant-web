import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { financialInitializationApi } from '../../api/financialInitialization'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import { CheckCircle, AlertTriangle, Landmark, DollarSign, ShieldAlert, X } from 'lucide-react'

const fmtMoney = (v) =>
  Number(v).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })

export default function FinancialInitialization() {
  const { hasRole } = useAuth()
  const navigate = useNavigate()
  const isAdminGeneral = hasRole('admin_general')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [errors, setErrors] = useState({})
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    setLoading(true)
    try {
      const res = await financialInitializationApi.status()
      const data = res.data.data || res.data
      setStatus(data)

      if (data.accounts && !data.initialized) {
        setAccounts(
          data.accounts.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            initial_balance: '',
            description: '',
          }))
        )
      }
    } catch (err) {
      toast.error('Error al cargar estado de inicialización')
    } finally {
      setLoading(false)
    }
  }

  const updateAccount = (idx, field, value) => {
    const copy = [...accounts]
    copy[idx] = { ...copy[idx], [field]: value }
    setAccounts(copy)
  }

  const totalInitial = accounts.reduce(
    (sum, a) => sum + (Number(a.initial_balance) || 0),
    0
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isAdminGeneral) {
      toast.error('Solo el administrador general puede inicializar')
      return
    }
    setShowConfirmModal(true)
  }

  const doInitialize = async () => {
    setShowConfirmModal(false)
    setSaving(true)
    setErrors({})
    try {
      await financialInitializationApi.initialize({
        accounts: accounts.map((a) => ({
          id: a.id,
          initial_balance: Number(a.initial_balance) || 0,
          description: a.description || '',
        })),
      })
      toast.success('Cuentas financieras inicializadas correctamente')
      await loadStatus()
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {})
      } else {
        toast.error(
          err.response?.data?.error?.message ||
            err.response?.data?.message ||
            'Error al inicializar'
        )
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  // Already initialized — show status
  if (status?.initialized) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Inicialización Financiera</h1>
            <p className="page-subtitle">Estado de las cuentas financieras del restaurante</p>
          </div>
        </div>

        <div className="card-flush" style={{ maxWidth: 600 }}>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <CheckCircle size={48} style={{ color: 'var(--color-success)', marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Cuentas Inicializadas
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              Las cuentas financieras fueron inicializadas el{' '}
              <strong>{new Date(status.initialized_at).toLocaleDateString('es-PE')}</strong>
            </p>
            <button
              className="btn-secondary"
              onClick={() => navigate('/finance/dashboard')}
            >
              Ir al Dashboard Financiero
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Not initialized — show form (admin_general only can submit)
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inicialización Financiera</h1>
          <p className="page-subtitle">
            Establece los saldos iniciales de cada cuenta financiera antes de comenzar operaciones
          </p>
        </div>
      </div>

      {!isAdminGeneral && (
        <div
          className="flex items-center gap-3"
          style={{
            background: 'var(--color-warning-bg, #fef3cd)',
            border: '1px solid var(--color-warning-border, #ffc107)',
            borderRadius: 8,
            padding: '1rem 1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <AlertTriangle size={20} style={{ color: 'var(--color-warning, #856404)', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            Las cuentas financieras no han sido inicializadas. Solo el <strong>Administrador General</strong> puede
            realizar esta operación. Contacta al administrador para habilitar las operaciones financieras.
          </p>
        </div>
      )}

      {!status?.has_accounts && (
        <div
          className="flex items-center gap-3"
          style={{
            background: 'var(--color-danger-bg, #f8d7da)',
            border: '1px solid var(--color-danger-border, #f5c6cb)',
            borderRadius: 8,
            padding: '1rem 1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <AlertTriangle size={20} style={{ color: 'var(--color-danger, #721c24)', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            No hay cuentas financieras creadas. Primero debes{' '}
            <a href="/finance/accounts" style={{ fontWeight: 600 }}>crear al menos una cuenta</a> antes de inicializar.
          </p>
        </div>
      )}

      {isAdminGeneral && status?.has_accounts && (
        <form onSubmit={handleSubmit}>
          <div className="card-flush" style={{ marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                Saldos Iniciales por Cuenta
              </h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Ingresa el saldo actual de cada cuenta. Usa 0 si la cuenta no tiene saldo.
              </p>
            </div>
            <div style={{ padding: '0' }}>
              {accounts.map((acc, idx) => (
                <div
                  key={acc.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 160px 1fr',
                    gap: '0.75rem',
                    alignItems: 'center',
                    padding: '0.75rem 1.5rem',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Landmark size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
                    <div>
                      <span style={{ fontWeight: 500 }}>{acc.name}</span>
                      <span className="badge--muted" style={{ fontSize: '0.7rem', marginLeft: 8 }}>
                        {acc.type === 'cash'
                          ? 'Efectivo'
                          : acc.type === 'bank'
                            ? 'Banco'
                            : acc.type === 'digital'
                              ? 'Digital'
                              : 'POS'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input"
                      placeholder="0.00"
                      value={acc.initial_balance}
                      onChange={(e) => updateAccount(idx, 'initial_balance', e.target.value)}
                      style={{ textAlign: 'right' }}
                    />
                    {errors[`accounts.${idx}.initial_balance`] && (
                      <p className="field-error">{errors[`accounts.${idx}.initial_balance`][0]}</p>
                    )}
                  </div>

                  <input
                    type="text"
                    className="input"
                    placeholder="Descripción (opcional)"
                    value={acc.description}
                    onChange={(e) => updateAccount(idx, 'description', e.target.value)}
                  />
                </div>
              ))}
            </div>

            {/* Total */}
            <div
              className="flex items-center justify-between"
              style={{
                padding: '1rem 1.5rem',
                background: 'var(--color-bg-muted, #f8f9fa)',
                fontWeight: 600,
              }}
            >
              <div className="flex items-center gap-2">
                <DollarSign size={16} />
                <span>Total a Inicializar</span>
              </div>
              <span style={{ fontSize: '1.1rem' }}>{fmtMoney(totalInitial)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/finance/dashboard')}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Inicializando...' : 'Confirmar Inicialización'}
            </button>
          </div>
        </form>
      )}

      {/* ── Confirmation modal ─────────────────────────────────── */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            style={{
              background: 'var(--color-bg)',
              borderRadius: 12,
              width: '100%', maxWidth: 480,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div className="flex items-center gap-2">
                <ShieldAlert size={20} style={{ color: 'var(--color-warning, #d97706)' }} />
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                  Confirmar Inicialización Financiera
                </span>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
              >
                <X size={18} style={{ opacity: 0.5 }} />
              </button>
            </div>

            {/* Warning banner */}
            <div
              style={{
                background: 'var(--color-warning-bg, #fffbeb)',
                borderBottom: '1px solid var(--color-warning-border, #fcd34d)',
                padding: '0.875rem 1.5rem',
                fontSize: '0.85rem',
              }}
            >
              <p style={{ margin: 0, color: 'var(--color-warning-text, #92400e)', fontWeight: 600, marginBottom: '0.4rem' }}>
                ⚠ Esta acción es única e irreversible
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--color-warning-text, #92400e)', lineHeight: 1.7 }}>
                <li>Los saldos que ingreses serán el <strong>punto de partida de toda la contabilidad</strong>.</li>
                <li>No podrás modificarlos una vez confirmados.</li>
                <li>La primera apertura de caja deberá coincidir exactamente con el saldo inicial de efectivo.</li>
              </ul>
            </div>

            {/* Accounts summary */}
            <div style={{ padding: '1rem 1.5rem', maxHeight: 220, overflowY: 'auto' }}>
              <p style={{ margin: '0 0 0.75rem', fontWeight: 600, fontSize: '0.875rem' }}>
                Saldos que se confirmarán:
              </p>
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between"
                  style={{ padding: '0.4rem 0', borderBottom: '1px solid var(--color-border)' }}
                >
                  <span style={{ fontSize: '0.875rem' }}>{acc.name}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {fmtMoney(acc.initial_balance || 0)}
                  </span>
                </div>
              ))}
              <div
                className="flex items-center justify-between"
                style={{ paddingTop: '0.75rem', fontWeight: 700 }}
              >
                <span>Total</span>
                <span>{fmtMoney(totalInitial)}</span>
              </div>
            </div>

            {/* Actions */}
            <div
              className="flex items-center justify-end gap-3"
              style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)' }}
            >
              <button
                className="btn-secondary"
                onClick={() => setShowConfirmModal(false)}
              >
                Revisar
              </button>
              <button
                className="btn-primary"
                style={{ background: 'var(--color-warning, #d97706)', borderColor: 'var(--color-warning, #d97706)' }}
                onClick={doInitialize}
              >
                Sí, inicializar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
