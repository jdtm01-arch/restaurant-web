import { useState, useEffect, useCallback } from 'react'
import { accountTransfersApi } from '../../api/accountTransfers'
import { financialAccountsApi } from '../../api/financialAccounts'
import { financialInitializationApi } from '../../api/financialInitialization'
import { useAuth } from '../../context/AuthContext'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { ArrowRightLeft, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { isFinancialNotInitializedError } from '../../components/ui/FinancialNotInitializedBanner'

const fmtMoney = (v) => v != null ? `S/ ${Number(v).toFixed(2)}` : '—'
const fmtDate = (v) => {
  if (!v) return '—'
  const s = String(v).slice(0, 10)
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}
const fmtDateTime = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  return d.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}

const today = new Date().toISOString().slice(0, 10)

/** Check if a transfer can be edited (max 5 days old) */
const canEdit = (createdAt) => {
  if (!createdAt) return false
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now - created
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays <= 5
}

export default function AccountTransfers() {
  const { currentRole } = useAuth()
  const isSuperAdmin = currentRole === 'admin_general'

  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState([])
  const [initialized, setInitialized] = useState(true)
  const [initChecked, setInitChecked] = useState(false)
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)

  // Create/Edit Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTransfer, setEditingTransfer] = useState(null) // null = create, object = edit
  const [form, setForm] = useState({ from_account_id: '', to_account_id: '', amount: '', description: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Confirmation Modal
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingData, setPendingData] = useState(null)

  // Delete Confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingTransfer, setDeletingTransfer] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchTransfers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await accountTransfersApi.list({ date_from: dateFrom, date_to: dateTo })
      setTransfers(res.data.data || [])
    } catch {
      toast.error('Error al cargar transferencias')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    fetchTransfers()
  }, [fetchTransfers])

  useEffect(() => {
    financialAccountsApi.list().then((r) => setAccounts(r.data.data || [])).catch(() => {})
    financialInitializationApi.status()
      .then((r) => {
        const data = r.data.data || r.data
        setInitialized(!!data.initialized)
      })
      .catch(() => {})
      .finally(() => setInitChecked(true))
  }, [])

  const openCreate = () => {
    setEditingTransfer(null)
    setForm({ from_account_id: '', to_account_id: '', amount: '', description: '' })
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (transfer) => {
    setEditingTransfer(transfer)
    setForm({
      from_account_id: String(transfer.from_account_id || ''),
      to_account_id: String(transfer.to_account_id || ''),
      amount: String(transfer.amount || ''),
      description: transfer.description || '',
    })
    setErrors({})
    setModalOpen(true)
  }

  const getAccountName = (id) => {
    const acc = accounts.find((a) => String(a.id) === String(id))
    return acc?.name || '—'
  }

  /** Form submit → open confirmation dialog */
  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (!form.from_account_id || !form.to_account_id || !form.amount) {
      toast.error('Completa todos los campos obligatorios')
      return
    }
    if (form.from_account_id === form.to_account_id) {
      setErrors({ to_account_id: ['La cuenta destino no puede ser la misma que la cuenta origen.'] })
      return
    }

    const payload = {
      from_account_id: Number(form.from_account_id),
      to_account_id: Number(form.to_account_id),
      amount: Number(form.amount),
      description: form.description || null,
    }
    setPendingData(payload)
    setConfirmOpen(true)
  }

  /** User confirms → actually submit to API */
  const handleConfirm = async () => {
    setConfirmOpen(false)
    setSaving(true)
    setErrors({})
    try {
      let res
      if (editingTransfer) {
        res = await accountTransfersApi.update(editingTransfer.id, pendingData)
      } else {
        res = await accountTransfersApi.create(pendingData)
      }
      toast.success(res.data.message || (editingTransfer ? 'Transferencia actualizada' : 'Transferencia realizada correctamente'))
      setModalOpen(false)
      setPendingData(null)
      fetchTransfers()
    } catch (err) {
      if (isFinancialNotInitializedError(err)) {
        toast.error('Las cuentas financieras no han sido inicializadas. Contacte al administrador.')
      } else if (err.response?.status === 422) {
        const apiErrors = err.response.data.errors || {}
        setErrors(apiErrors)
        const msg = apiErrors.transfer?.[0] || err.response.data?.error?.message || err.response.data?.message
        if (msg) toast.error(msg)
      } else {
        toast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Error al realizar transferencia')
      }
    } finally {
      setSaving(false)
    }
  }

  /** Delete flow */
  const openDelete = (transfer) => {
    setDeletingTransfer(transfer)
    setDeleteConfirmOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingTransfer) return
    setDeleting(true)
    try {
      const res = await accountTransfersApi.destroy(deletingTransfer.id)
      toast.success(res.data.message || 'Transferencia eliminada')
      setDeleteConfirmOpen(false)
      setDeletingTransfer(null)
      fetchTransfers()
    } catch (err) {
      const delErrors = err.response?.data?.errors || {}
      const delMsg = delErrors.transfer?.[0] || err.response?.data?.error?.message || err.response?.data?.message || 'Error al eliminar transferencia'
      toast.error(delMsg)
    } finally {
      setDeleting(false)
    }
  }

  const activeAccounts = accounts.filter((a) => a.is_active)

  const columns = [
    { key: 'id', label: 'ID', className: 'w-16' },
    {
      key: 'from_account',
      label: 'Cuenta Origen',
      render: (row) => row.from_account?.name || '—',
    },
    {
      key: 'to_account',
      label: 'Cuenta Destino',
      render: (row) => row.to_account?.name || '—',
    },
    {
      key: 'amount',
      label: 'Monto',
      className: 'w-32 text-right',
      render: (row) => fmtMoney(row.amount),
    },
    { key: 'description', label: 'Descripción', render: (row) => row.description || '—' },
    {
      key: 'creator',
      label: 'Realizado por',
      render: (row) => row.creator?.name || '—',
    },
    {
      key: 'created_at',
      label: 'Fecha',
      className: 'w-40',
      render: (row) => fmtDateTime(row.created_at),
    },
    {
      key: 'actions',
      label: '',
      className: 'w-24',
      render: (row) => (
        <div className="action-cell">
          {canEdit(row.created_at) && (
            <button
              className="action-btn--edit"
              title="Editar transferencia"
              onClick={() => openEdit(row)}
            >
              <Pencil className="sidebar__link-icon" />
            </button>
          )}
          {isSuperAdmin && (
            <button
              className="action-btn--delete"
              title="Eliminar transferencia"
              onClick={() => openDelete(row)}
            >
              <Trash2 className="sidebar__link-icon" />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="page-title">Transferencias entre Cuentas</h1>
          <p className="page-subtitle">Mueve fondos entre tus cuentas financieras</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={openCreate}
            className="btn-primary"
            disabled={initChecked && !initialized}
            title={initChecked && !initialized ? 'Las cuentas financieras no han sido inicializadas' : undefined}
          >
            <Plus className="sidebar__link-icon" /> Nueva Transferencia
          </button>
          {initChecked && !initialized && (
            <span className="text-xs text-red-500">Cuentas no inicializadas — inicializa las cuentas para transferir</span>
          )}
        </div>
      </div>

      {/* Date filters */}
      <div className="card-flush" style={{ marginBottom: '1rem' }}>
        <div className="flex items-center gap-4 p-4">
          <div>
            <label className="label">Desde</label>
            <input
              type="date"
              className="input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input
              type="date"
              className="input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card-flush">
        <DataTable columns={columns} data={transfers} loading={loading} emptyMessage="No hay transferencias registradas" />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTransfer ? 'Editar Transferencia' : 'Nueva Transferencia'}
      >
        <form onSubmit={handleFormSubmit} className="admin-form">
          <div>
            <label className="label">Cuenta Origen</label>
            <select
              className="input"
              value={form.from_account_id}
              onChange={(e) => setForm({ ...form, from_account_id: e.target.value })}
              required
            >
              <option value="">Seleccionar...</option>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            {errors.from_account_id && <p className="field-error">{errors.from_account_id[0]}</p>}
          </div>

          <div>
            <label className="label">Cuenta Destino</label>
            <select
              className="input"
              value={form.to_account_id}
              onChange={(e) => setForm({ ...form, to_account_id: e.target.value })}
              required
            >
              <option value="">Seleccionar...</option>
              {activeAccounts
                .filter((a) => String(a.id) !== String(form.from_account_id))
                .map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
            </select>
            {errors.to_account_id && <p className="field-error">{errors.to_account_id[0]}</p>}
          </div>

          <div>
            <label className="label">Monto</label>
            <input
              type="number"
              className="input"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              required
            />
            {errors.amount && <p className="field-error">{errors.amount[0]}</p>}
          </div>

          <div>
            <label className="label">Descripción (opcional)</label>
            <input
              className="input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ej: Depósito a banco"
            />
          </div>

          {errors.transfer && <p className="field-error">{errors.transfer[0]}</p>}

          <div className="admin-form__actions">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Procesando...' : (editingTransfer ? 'Actualizar' : 'Transferir')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmar Transferencia"
      >
        {pendingData && (
          <div>
            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
              <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />
              <p style={{ fontSize: '0.875rem', color: '#92400e' }}>
                {editingTransfer ? 'Estás por actualizar esta transferencia. Revisa los detalles:' : 'Estás por registrar una transferencia. Revisa los detalles:'}
              </p>
            </div>

            <div className="space-y-3" style={{ fontSize: '0.9rem' }}>
              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>Cuenta Origen:</span>
                <span className="font-semibold">{getAccountName(pendingData.from_account_id)}</span>
              </div>
              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>Cuenta Destino:</span>
                <span className="font-semibold">{getAccountName(pendingData.to_account_id)}</span>
              </div>
              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>Monto:</span>
                <span className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>{fmtMoney(pendingData.amount)}</span>
              </div>
              {pendingData.description && (
                <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>Descripción:</span>
                  <span>{pendingData.description}</span>
                </div>
              )}
            </div>

            <div className="admin-form__actions" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setConfirmOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={handleConfirm} disabled={saving}>
                {saving ? 'Procesando...' : (editingTransfer ? 'Confirmar Actualización' : 'Confirmar Transferencia')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Eliminar Transferencia"
      >
        {deletingTransfer && (
          <div>
            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
              <p style={{ fontSize: '0.875rem', color: '#991b1b' }}>
                Esta acción es irreversible. Se eliminarán la transferencia y sus movimientos financieros asociados.
              </p>
            </div>

            <div className="space-y-3" style={{ fontSize: '0.9rem' }}>
              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>ID:</span>
                <span className="font-semibold">#{deletingTransfer.id}</span>
              </div>
              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>De:</span>
                <span>{deletingTransfer.from_account?.name || '—'}</span>
              </div>
              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>A:</span>
                <span>{deletingTransfer.to_account?.name || '—'}</span>
              </div>
              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>Monto:</span>
                <span className="font-bold" style={{ color: '#dc2626' }}>{fmtMoney(deletingTransfer.amount)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>Fecha:</span>
                <span>{fmtDateTime(deletingTransfer.created_at)}</span>
              </div>
            </div>

            <div className="admin-form__actions" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setDeleteConfirmOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Eliminar Transferencia'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
