import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

/**
 * Shows a banner when the restaurant's financial accounts haven't been initialized.
 * Used on pages blocked by the financial.initialized middleware.
 */
export default function FinancialNotInitializedBanner() {
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const isAdmin = hasRole('admin_general', 'admin_restaurante')

  return (
    <div
      style={{
        background: 'var(--color-warning-bg, #fff8e1)',
        border: '1px solid var(--color-warning-border, #ffe082)',
        borderRadius: 8,
        padding: '1.5rem 2rem',
        maxWidth: 600,
        margin: '2rem auto',
      }}
    >
      <div className="flex items-center gap-3" style={{ marginBottom: '0.75rem' }}>
        <AlertTriangle size={24} style={{ color: 'var(--color-warning, #f59e0b)', flexShrink: 0 }} />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
          Cuentas financieras no inicializadas
        </h3>
      </div>
      <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
        Las cuentas financieras del restaurante no han sido inicializadas.
        {isAdmin
          ? ' Es necesario completar la inicialización para habilitar las operaciones financieras.'
          : ' Contacte al administrador general para realizar la inicialización.'}
      </p>
      {isAdmin && (
        <button
          className="btn-primary btn-sm"
          onClick={() => navigate('/finance/initialization')}
        >
          Ir a Inicialización
        </button>
      )}
    </div>
  )
}

/**
 * Helper to detect if an axios error is a "financial not initialized" 403.
 */
export function isFinancialNotInitializedError(err) {
  return (
    err?.response?.status === 403 &&
    err?.response?.data?.error?.code === 'FINANCIAL_NOT_INITIALIZED'
  )
}
