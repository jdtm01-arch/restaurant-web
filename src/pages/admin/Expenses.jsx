import { useState, useEffect, useCallback, useRef } from 'react'
import { expensesApi } from '../../api/expenses'
import { suppliersApi } from '../../api/suppliers'
import { expenseCategoriesApi } from '../../api/expenseCategories'
import { catalogsApi } from '../../api/catalogs'
import { cashRegistersApi } from '../../api/cashRegisters'
import { financialAccountsApi } from '../../api/financialAccounts'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Pagination from '../../components/ui/Pagination'
import { Plus, Pencil, Trash2, Eye, Paperclip, Upload, X, Download } from 'lucide-react'
import toast from 'react-hot-toast'

const emptyForm = {
  supplier_id: '', expense_category_id: '', expense_status_id: '',
  amount: '', description: '', expense_date: new Date().toISOString().slice(0, 10),
}
const emptyPayForm = { payment_method_id: '', financial_account_id: '', amount: '', paid_at: new Date().toISOString().slice(0, 10) }

export default function Expenses() {
  const [expenses, setExpenses]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [page, setPage]           = useState(1)
  const [lastPage, setLastPage]   = useState(1)

  const [suppliers, setSuppliers]         = useState([])
  const [categories, setCategories]       = useState([])
  const [statuses, setStatuses]           = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [financialAccounts, setFinancialAccounts] = useState([])

  // Cash register check
  const [currentCashRegister, setCurrentCashRegister] = useState(null)
  const [cajaChecked, setCajaChecked] = useState(false)

  // Create / Edit modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState({ ...emptyForm })
  const [errors, setErrors]       = useState({})
  const [saving, setSaving]       = useState(false)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Detail modal (payments + attachments)
  const [detail, setDetail]           = useState(null)   // expense loaded with relations
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTab, setDetailTab]     = useState('payments') // 'payments' | 'attachments'
  const [payForm, setPayForm]         = useState({ ...emptyPayForm })
  const [payErrors, setPayErrors]     = useState({})
  const [payingSaving, setPayingSaving] = useState(false)
  const [deleteAttachTarget, setDeleteAttachTarget] = useState(null)
  const [attachSaving, setAttachSaving] = useState(false)
  const fileInputRef = useRef(null)

  // Supplier autocomplete
  const [supplierSearch, setSupplierSearch]       = useState('')
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false)
  const supplierSearchRef = useRef(null)

  /* ── FETCH LIST ── */
  const fetchExpenses = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await expensesApi.list({ page: p })
      setExpenses(res.data.data || [])
      setPage(res.data.current_page || 1)
      setLastPage(res.data.last_page || 1)
    } catch {
      toast.error('Error al cargar gastos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  useEffect(() => {
    suppliersApi.list().then((r) => setSuppliers(r.data.data || [])).catch(() => {})
    expenseCategoriesApi.list().then((r) => setCategories(r.data.data || [])).catch(() => {})
    catalogsApi.expenseStatuses().then((r) => setStatuses(r.data.data || [])).catch(() => {})
    catalogsApi.paymentMethods().then((r) => setPaymentMethods(r.data.data || [])).catch(() => {})
    financialAccountsApi.list().then((r) => {
      const active = (r.data.data || []).filter((a) => a.is_active)
      setFinancialAccounts(active)
      const cash = active.find((a) => a.type === 'cash')
      if (cash) setPayForm((prev) => ({ ...prev, financial_account_id: String(cash.id) }))
    }).catch(() => {})
    cashRegistersApi.current()
      .then((r) => setCurrentCashRegister(r.data.data))
      .catch(() => setCurrentCashRegister(null))
      .finally(() => setCajaChecked(true))
  }, [])

  // Auto-set pending status when statuses load and we're in create mode
  useEffect(() => {
    if (modalOpen && !editing && statuses.length > 0) {
      const pendingStatus = statuses.find((s) => s.slug === 'pending')
      if (pendingStatus) {
        setForm((prev) => ({ ...prev, expense_status_id: prev.expense_status_id || pendingStatus.id }))
      }
    }
  }, [statuses, modalOpen, editing])

  // Close supplier dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (supplierSearchRef.current && !supplierSearchRef.current.contains(e.target)) {
        setSupplierDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Toggle paid status
  const [toggleTarget, setToggleTarget] = useState(null)
  const [toggleSaving, setToggleSaving] = useState(false)

  const handleTogglePaid = async () => {
    if (!toggleTarget) return
    setToggleSaving(true)
    try {
      // Load full detail to check payments
      const detailRes = await expensesApi.show(toggleTarget.id)
      const expense = detailRes.data
      const paid = expense.payments?.reduce((s, p) => s + Number(p.amount), 0) || 0
      const remaining = Math.max(0, Number(expense.amount) - paid)

      if (paid <= 0) {
        toast.error('No se puede marcar como pagado. No hay pagos registrados.')
        setToggleSaving(false)
        setToggleTarget(null)
        return
      }

      if (remaining > 0) {
        toast.error(`Aún hay un saldo pendiente de S/ ${remaining.toFixed(2)}. Registra todos los pagos antes de marcar como pagado.`)
        setToggleSaving(false)
        setToggleTarget(null)
        return
      }

      // Find the "paid" status id
      const paidStatus = statuses.find((s) => s.slug === 'paid')
      if (!paidStatus) {
        toast.error('No se encontró el estado "Pagado" en el sistema')
        setToggleSaving(false)
        return
      }

      // Update expense status to paid via the update endpoint
      await expensesApi.update(toggleTarget.id, {
        supplier_id: expense.supplier_id || expense.supplier?.id || null,
        expense_category_id: expense.expense_category_id || expense.category?.id,
        expense_status_id: paidStatus.id,
        amount: expense.amount,
        description: expense.description,
        expense_date: expense.expense_date ? String(expense.expense_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      })

      toast.success('Gasto marcado como pagado')
      setToggleTarget(null)
      fetchExpenses(page)
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Error al cambiar estado')
    } finally {
      setToggleSaving(false)
    }
  }

  /* ── HELPERS ── */
  const fmtMoney = (v) => v != null ? `S/ ${Number(v).toFixed(2)}` : '—'
  const fmtDate  = (v) => {
    if (!v) return '—'
    const s = String(v).slice(0, 10)
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('es-PE')
  }

  /* ── DETAIL MODAL ── */
  const openDetail = async (expense, tab = 'payments') => {
    setDetailTab(tab)
    setDetail(null)
    setPayErrors({})
    setPayForm({ ...emptyPayForm })
    setDetailLoading(true)
    try {
      const res = await expensesApi.show(expense.id)
      setDetail(res.data)
    } catch {
      toast.error('Error al cargar detalle del gasto')
    } finally {
      setDetailLoading(false)
    }
  }

  const reloadDetail = async () => {
    if (!detail) return
    try {
      const res = await expensesApi.show(detail.id)
      setDetail(res.data)
      fetchExpenses(page)
    } catch {}
  }

  /* ── PAYMENTS ── */
  const totalPaid      = detail ? detail.payments?.reduce((s, p) => s + Number(p.amount), 0) : 0
  const totalRemaining = detail ? Math.max(0, Number(detail.amount) - totalPaid) : 0
  const isLocked       = detail?.status?.slug === 'paid' || detail?.status?.slug === 'cancelled'

  const handlePayment = async (e) => {
    e.preventDefault()
    setPayingSaving(true)
    setPayErrors({})
    try {
      await expensesApi.storePayment(detail.id, {
        payment_method_id: Number(payForm.payment_method_id),
        amount:            Number(payForm.amount),
        paid_at:           payForm.paid_at,
        financial_account_id: Number(payForm.financial_account_id),
      })
      toast.success('Pago registrado')
      const cash = financialAccounts.find((a) => a.type === 'cash')
      setPayForm({ ...emptyPayForm, financial_account_id: cash ? String(cash.id) : '' })
      await reloadDetail()
    } catch (err) {
      if (err.response?.status === 422) {
        setPayErrors(err.response.data.errors || {})
      } else {
        toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Error al registrar pago')
      }
    } finally {
      setPayingSaving(false)
    }
  }

  /* ── ATTACHMENTS ── */
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachSaving(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      await expensesApi.storeAttachment(detail.id, fd)
      toast.success('Adjunto subido')
      await reloadDetail()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al subir adjunto')
    } finally {
      setAttachSaving(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteAttach = async () => {
    if (!deleteAttachTarget) return
    setAttachSaving(true)
    try {
      await expensesApi.destroyAttachment(detail.id, deleteAttachTarget.id)
      toast.success('Adjunto eliminado')
      setDeleteAttachTarget(null)
      await reloadDetail()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar adjunto')
    } finally {
      setAttachSaving(false)
    }
  }

  /* ── CREATE / EDIT ── */
  const openCreate = () => {
    if (!currentCashRegister) {
      toast.error('No hay caja abierta. Abre la caja antes de registrar un gasto.')
      return
    }
    setEditing(null)
    const pendingStatus = statuses.find((s) => s.slug === 'pending')
    setForm({ ...emptyForm, expense_status_id: pendingStatus?.id || '' })
    setSupplierSearch('')
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    const supplierName = item.supplier?.name ||
      suppliers.find((s) => s.id === item.supplier_id)?.name || ''
    setSupplierSearch(supplierName)
    setForm({
      supplier_id:          item.supplier_id || '',
      expense_category_id:  item.expense_category_id || item.category?.id || '',
      expense_status_id:    item.expense_status_id || item.status?.id || '',
      amount:               item.amount || '',
      description:          item.description || '',
      expense_date:         item.expense_date ? item.expense_date.slice(0, 10) : '',
    })
    setErrors({})
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    const payload = {
      ...form,
      supplier_id:          form.supplier_id || null,
      expense_category_id:  Number(form.expense_category_id),
      expense_status_id:    Number(form.expense_status_id),
      amount:               Number(form.amount),
    }
    try {
      if (editing) {
        await expensesApi.update(editing.id, payload)
        toast.success('Gasto actualizado')
      } else {
        await expensesApi.create(payload)
        toast.success('Gasto creado')
      }
      setModalOpen(false)
      fetchExpenses(page)
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {})
      } else {
        toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Error')
      }
    } finally {
      setSaving(false)
    }
  }

  /* ── DELETE ── */
  const handleDelete = async () => {
    if (deleteTarget?.status?.slug === 'paid') {
      toast.error('El registro no se puede eliminar porque su status actual ya está fijado como Pagado')
      setDeleteTarget(null)
      return
    }
    setSaving(true)
    try {
      await expensesApi.destroy(deleteTarget.id)
      toast.success('Gasto eliminado')
      setDeleteTarget(null)
      fetchExpenses(page)
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al eliminar'
      if (msg.toLowerCase().includes('pagado') || err.response?.data?.error?.code === 'EXPENSE_CANNOT_DELETE_PAID') {
        toast.error('El registro no se puede eliminar porque su status actual ya está fijado como Pagado')
      } else {
        toast.error(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  /* ── COLUMNS ── */
  const columns = [
    { key: 'id', label: 'ID', className: 'w-16' },
    { key: 'expense_date', label: 'Fecha', render: (r) => fmtDate(r.expense_date) },
    { key: 'description', label: 'Descripción' },
    { key: 'category',  label: 'Categoría', render: (r) => r.category?.name  || '—' },
    { key: 'supplier',  label: 'Proveedor',  render: (r) => r.supplier?.name  || '—' },
    { key: 'amount',    label: 'Monto',      render: (r) => fmtMoney(r.amount) },
    {
      key: 'status', label: 'Estado', className: 'w-28',
      render: (r) => {
        const slug = r.status?.slug
        if (slug === 'paid') {
          return <span className="badge--success">{r.status?.name || 'Pagado'}</span>
        }
        return (
          <button
            type="button"
            className={slug === 'partial' ? 'badge-toggle--active' : 'badge-toggle--inactive'}
            title="Marcar como pagado"
            onClick={() => setToggleTarget(r)}
          >
            {r.status?.name || '—'}
          </button>
        )
      },
    },
    {
      key: 'actions', label: 'Acciones', className: 'w-36 text-right',
      render: (r) => {
        const isPaid = r.status?.slug === 'paid'
        return (
          <div className="action-cell">
            <button onClick={() => openDetail(r, 'payments')}
              className="action-btn--warning" title="Ver pagos">
              <Eye className="sidebar__link-icon" />
            </button>
            <button onClick={() => openDetail(r, 'attachments')}
              className="action-btn--edit" title="Adjuntos" style={{ color: '#6366f1' }}>
              <Paperclip className="sidebar__link-icon" />
            </button>
            {!isPaid && (
              <button onClick={() => openEdit(r)} className="action-btn--edit" title="Editar">
                <Pencil className="sidebar__link-icon" />
              </button>
            )}
            <button onClick={() => setDeleteTarget(r)} className="action-btn--delete" title="Eliminar">
              <Trash2 className="sidebar__link-icon" />
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="page-title">Gastos</h1>
          <p className="page-subtitle">Gestiona los gastos del restaurante</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={openCreate}
            className="btn-primary"
            disabled={cajaChecked && !currentCashRegister}
            title={cajaChecked && !currentCashRegister ? 'No hay caja abierta' : undefined}
          >
            <Plus className="sidebar__link-icon" /> Nuevo Gasto
          </button>
          {cajaChecked && !currentCashRegister && (
            <span className="text-xs text-red-500">Caja cerrada — abre la caja para registrar gastos</span>
          )}
        </div>
      </div>

      <div className="card-flush">
        <DataTable columns={columns} data={expenses} loading={loading} emptyMessage="No hay gastos registrados" />
        <Pagination currentPage={page} lastPage={lastPage} onPageChange={(p) => fetchExpenses(p)} />
      </div>

      {/* ── Create / Edit modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Gasto' : 'Nuevo Gasto'} maxWidth="max-w-xl">
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form__grid-2">
            <div>
              <label className="label">Fecha *</label>
              <input type="date" className="input" value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })} required />
              {errors.expense_date && <p className="field-error">{errors.expense_date[0]}</p>}
            </div>
            <div>
              <label className="label">Monto *</label>
              <input type="number" step="0.01" min="0.01" className="input" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="0.00" />
              {errors.amount && <p className="field-error">{errors.amount[0]}</p>}
            </div>
          </div>
          <div>
            <label className="label">Descripción *</label>
            <textarea className="input" rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} required
              placeholder="Descripción del gasto" />
            {errors.description && <p className="field-error">{errors.description[0]}</p>}
          </div>
          <div className="admin-form__grid-2">
            <div>
              <label className="label">Categoría *</label>
              <select className="input" value={form.expense_category_id}
                onChange={(e) => setForm({ ...form, expense_category_id: e.target.value })} required>
                <option value="">Seleccionar...</option>
                {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
              {errors.expense_category_id && <p className="field-error">{errors.expense_category_id[0]}</p>}
            </div>
            <div>
              <label className="label">Estado *</label>
              {!editing ? (
                <input
                  className="input bg-gray-50 text-gray-500 cursor-not-allowed"
                  value={statuses.find((s) => s.slug === 'pending')?.name ?? 'Pendiente'}
                  disabled
                  readOnly
                />
              ) : (
                <select className="input" value={form.expense_status_id}
                  onChange={(e) => setForm({ ...form, expense_status_id: e.target.value })} required>
                  <option value="">Seleccionar...</option>
                  {statuses.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              )}
              {errors.expense_status_id && <p className="field-error">{errors.expense_status_id[0]}</p>}
            </div>
          </div>
          {errors.payments && <p className="field-error">{Array.isArray(errors.payments) ? errors.payments[0] : errors.payments}</p>}
          <div className="relative" ref={supplierSearchRef}>
            <label className="label">Proveedor</label>
            <input
              type="text"
              className="input"
              placeholder="Buscar por nombre o RUC..."
              value={supplierSearch}
              autoComplete="off"
              onChange={(e) => {
                setSupplierSearch(e.target.value)
                setSupplierDropdownOpen(true)
                if (!e.target.value) setForm({ ...form, supplier_id: '' })
              }}
              onFocus={() => setSupplierDropdownOpen(true)}
            />
            {supplierDropdownOpen && (
              <div className="absolute z-20 bg-white border border-gray-200 rounded shadow-lg w-full max-h-48 overflow-y-auto mt-1">
                <div
                  className="px-3 py-2 cursor-pointer hover:bg-orange-50 text-gray-500"
                  onMouseDown={() => {
                    setForm({ ...form, supplier_id: '' })
                    setSupplierSearch('')
                    setSupplierDropdownOpen(false)
                  }}
                >
                  Sin proveedor
                </div>
                {suppliers
                  .filter((s) => {
                    const q = supplierSearch.toLowerCase()
                    return !q || s.name.toLowerCase().includes(q) || (s.ruc && s.ruc.toLowerCase().includes(q))
                  })
                  .map((s) => (
                    <div
                      key={s.id}
                      className="px-3 py-2 cursor-pointer hover:bg-orange-50 flex items-center gap-2"
                      onMouseDown={() => {
                        setForm({ ...form, supplier_id: s.id })
                        setSupplierSearch(s.name)
                        setSupplierDropdownOpen(false)
                      }}
                    >
                      <span className="font-medium">{s.name}</span>
                      {s.ruc && <span className="text-xs text-gray-400">RUC: {s.ruc}</span>}
                    </div>
                  ))
                }
                {suppliers.filter((s) => {
                  const q = supplierSearch.toLowerCase()
                  return !q || s.name.toLowerCase().includes(q) || (s.ruc && s.ruc.toLowerCase().includes(q))
                }).length === 0 && supplierSearch && (
                  <div className="px-3 py-2 text-gray-400 text-sm">Sin resultados</div>
                )}
              </div>
            )}
          </div>
          <div className="admin-form__actions">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Detail modal (payments + attachments) ── */}
      <Modal open={!!detail || detailLoading} onClose={() => { setDetail(null); setDetailLoading(false) }}
        title="Detalle del Gasto" maxWidth="max-w-2xl">
        {detailLoading && <p className="page-subtitle text-center py-4">Cargando...</p>}
        {detail && (
          <div className="admin-form">
            {/* Header info */}
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <span className="label" style={{ fontSize: 11 }}>Descripción</span>
                <p style={{ margin: 0, fontWeight: 600 }}>{detail.description}</p>
              </div>
              <div>
                <span className="label" style={{ fontSize: 11 }}>Fecha</span>
                <p style={{ margin: 0 }}>{fmtDate(detail.expense_date)}</p>
              </div>
              <div>
                <span className="label" style={{ fontSize: 11 }}>Monto total</span>
                <p style={{ margin: 0, fontWeight: 700, color: '#d97706' }}>{fmtMoney(detail.amount)}</p>
              </div>
              <div>
                <span className="label" style={{ fontSize: 11 }}>Estado</span>
                <p style={{ margin: 0 }}>
                  <span className={detail.status?.slug === 'paid' ? 'badge--success' : detail.status?.slug === 'partial' ? 'badge--warning' : 'badge--muted'}>
                    {detail.status?.name || '—'}
                  </span>
                </p>
              </div>
              {detail.supplier && (
                <div>
                  <span className="label" style={{ fontSize: 11 }}>Proveedor</span>
                  <p style={{ margin: 0 }}>{detail.supplier.name}</p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e5e7eb', marginBottom: 16 }}>
              {['payments', 'attachments'].map((tab) => (
                <button key={tab} type="button"
                  onClick={() => setDetailTab(tab)}
                  style={{
                    padding: '6px 16px', background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: detailTab === tab ? '2px solid #f59b20' : '2px solid transparent',
                    fontWeight: detailTab === tab ? 700 : 400,
                    color: detailTab === tab ? '#f59b20' : '#6b7280',
                    marginBottom: -2,
                  }}>
                  {tab === 'payments' ? '💰 Pagos' : '📎 Adjuntos'}
                </button>
              ))}
            </div>

            {/* ── PAYMENTS TAB ── */}
            {detailTab === 'payments' && (
              <div>
                {/* Summary */}
                <div style={{ display: 'flex', gap: 24, marginBottom: 12, padding: '8px 0' }}>
                  <div><span className="label" style={{ fontSize: 11 }}>Total pagado</span>
                    <p style={{ margin: 0, fontWeight: 700, color: '#16a34a' }}>{fmtMoney(totalPaid)}</p></div>
                  <div><span className="label" style={{ fontSize: 11 }}>Pendiente</span>
                    <p style={{ margin: 0, fontWeight: 700, color: totalRemaining > 0 ? '#dc2626' : '#6b7280' }}>{fmtMoney(totalRemaining)}</p></div>
                </div>

                {/* Payments list */}
                {detail.payments?.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 16 }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Método</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Fecha pago</th>
                        <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.payments.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '6px 10px' }}>{p.payment_method?.name || '—'}</td>
                          <td style={{ padding: '6px 10px' }}>{fmtDate(p.paid_at)}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>{fmtMoney(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="page-subtitle" style={{ marginBottom: 12 }}>No hay pagos registrados.</p>
                )}

                {/* Add payment form — only if not locked and has remaining */}
                {!isLocked && totalRemaining > 0 && (
                  <form onSubmit={handlePayment} style={{ background: '#f9fafb', borderRadius: 8, padding: 12 }}>
                    <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: 14 }}>Registrar pago</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                      <div>
                        <label className="label">Método *</label>
                        <select className="input" value={payForm.payment_method_id}
                          onChange={(e) => setPayForm({ ...payForm, payment_method_id: e.target.value })} required>
                          <option value="">Seleccionar...</option>
                          {paymentMethods.map((pm) => (<option key={pm.id} value={pm.id}>{pm.name}</option>))}
                        </select>
                        {payErrors.payment_method_id && <p className="field-error">{payErrors.payment_method_id[0]}</p>}
                      </div>
                      <div>
                        <label className="label">Cuenta *</label>
                        <select className="input" value={payForm.financial_account_id}
                          onChange={(e) => setPayForm({ ...payForm, financial_account_id: e.target.value })} required>
                          <option value="">Seleccionar...</option>
                          {financialAccounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                        </select>
                        {payErrors.financial_account_id && <p className="field-error">{payErrors.financial_account_id[0]}</p>}
                      </div>
                      <div>
                        <label className="label">Monto *</label>
                        <input type="number" step="0.01" min="0.01" max={totalRemaining} className="input"
                          value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                          required placeholder={`Máx ${fmtMoney(totalRemaining)}`} />
                        {payErrors.amount && <p className="field-error">{payErrors.amount[0]}</p>}
                      </div>
                      <div>
                        <label className="label">Fecha pago *</label>
                        <input type="date" className="input" value={payForm.paid_at}
                          onChange={(e) => setPayForm({ ...payForm, paid_at: e.target.value })} required />
                        {payErrors.paid_at && <p className="field-error">{payErrors.paid_at[0]}</p>}
                      </div>
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="submit" className="btn-primary" disabled={payingSaving}>
                        {payingSaving ? 'Registrando...' : 'Registrar Pago'}
                      </button>
                    </div>
                  </form>
                )}

                {isLocked && (
                  <p className="page-subtitle" style={{ color: '#6b7280', fontSize: 13, fontStyle: 'italic' }}>
                    Este gasto está {detail.status?.name?.toLowerCase()} y no acepta más pagos.
                  </p>
                )}
              </div>
            )}

            {/* ── ATTACHMENTS TAB ── */}
            {detailTab === 'attachments' && (
              <div>
                {/* Upload */}
                <div style={{ marginBottom: 14 }}>
                  <input ref={fileInputRef} type="file" id="attach-upload" style={{ display: 'none' }}
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
                    onChange={handleFileUpload} disabled={attachSaving} />
                  <label htmlFor="attach-upload"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      cursor: attachSaving ? 'not-allowed' : 'pointer',
                      padding: '7px 14px', borderRadius: 6, fontWeight: 600, fontSize: 14,
                      background: '#f59b20', color: '#fff', opacity: attachSaving ? 0.7 : 1,
                    }}>
                    <Upload style={{ width: 16, height: 16 }} />
                    {attachSaving ? 'Subiendo...' : 'Subir adjunto'}
                  </label>
                  <span style={{ marginLeft: 10, fontSize: 12, color: '#9ca3af' }}>PDF, JPG, PNG, WEBP — máx 10 MB</span>
                </div>

                {/* Attachments list */}
                {detail.attachments?.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Archivo</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Subido</th>
                        <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.attachments.map((a) => (
                        <tr key={a.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '6px 10px' }}>
                            <span title={a.file_name || a.file_path} style={{ maxWidth: 220, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                              {a.file_name || a.file_path.split('/').pop()}
                            </span>
                          </td>
                          <td style={{ padding: '6px 10px', color: '#6b7280', fontSize: 13 }}>
                            {a.created_at ? fmtDate(a.created_at) : '—'}
                            {a.uploader ? ` · ${a.uploader.name}` : ''}
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                            <div className="action-cell" style={{ justifyContent: 'flex-end' }}>
                              {a.file_url && (
                                <a href={a.file_url} target="_blank" rel="noreferrer"
                                  className="action-btn--edit" title="Descargar / Ver"
                                  style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 6px' }}>
                                  <Download style={{ width: 15, height: 15 }} />
                                </a>
                              )}
                              <button onClick={() => setDeleteAttachTarget(a)}
                                className="action-btn--delete" title="Eliminar adjunto" disabled={attachSaving}>
                                <X style={{ width: 14, height: 14 }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="page-subtitle">No hay adjuntos para este gasto.</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Delete expense ── */}
      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Eliminar Gasto"
        message={deleteTarget?.status?.slug === 'paid'
          ? 'El registro no se puede eliminar porque su status actual ya está fijado como Pagado.'
          : `¿Seguro que deseas eliminar el gasto "${deleteTarget?.description}"?`}
        loading={saving}
        confirmText={deleteTarget?.status?.slug === 'paid' ? undefined : 'Eliminar'}
      />

      {/* ── Delete attachment ── */}
      <ConfirmDialog
        open={!!deleteAttachTarget} onClose={() => setDeleteAttachTarget(null)} onConfirm={handleDeleteAttach}
        title="Eliminar Adjunto"
        message={`¿Seguro que deseas eliminar el archivo "${deleteAttachTarget?.file_name || deleteAttachTarget?.file_path}"?`}
        loading={attachSaving}
      />

      {/* ── Toggle paid status ── */}
      <ConfirmDialog
        open={!!toggleTarget} onClose={() => setToggleTarget(null)} onConfirm={handleTogglePaid}
        title="Marcar como Pagado"
        message={`¿Deseas marcar el gasto "${toggleTarget?.description}" como pagado? Se registrará el saldo pendiente como pago.`}
        confirmText="Sí, marcar pagado"
        cancelText="Cancelar"
        variant="primary"
        loading={toggleSaving}
      />
    </div>
  )
}

