import { useState, useEffect, useCallback } from 'react'
import { wasteLogsApi } from '../../api/wasteLogs'
import { productsApi } from '../../api/products'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Pagination from '../../components/ui/Pagination'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const REASONS = [
  { value: 'expired', label: 'Vencido' },
  { value: 'damaged', label: 'Dañado' },
  { value: 'preparation', label: 'Preparación' },
  { value: 'other', label: 'Otro' },
]

const emptyForm = {
  product_id: '', quantity: '', unit: '', reason: '', waste_date: new Date().toISOString().slice(0, 10), notes: '',
}

export default function WasteLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [products, setProducts] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [errors, setErrors] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)

  // Filters
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterReason, setFilterReason] = useState('')

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p }
      if (filterDateFrom) params.date_from = filterDateFrom
      if (filterDateTo) params.date_to = filterDateTo
      if (filterReason) params.reason = filterReason
      const res = await wasteLogsApi.list(params)
      setLogs(res.data.data || [])
      setPage(res.data.current_page || 1)
      setLastPage(res.data.last_page || 1)
    } catch {
      toast.error('Error al cargar mermas')
    } finally {
      setLoading(false)
    }
  }, [filterDateFrom, filterDateTo, filterReason])

  useEffect(() => { fetchLogs() }, [fetchLogs])
  useEffect(() => {
    productsApi.list().then((r) => setProducts(r.data.data || [])).catch(() => {})
  }, [])

  const fmtDate = (v) => {
    if (!v) return '—'
    const s = String(v).slice(0, 10)
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('es-PE')
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      product_id: item.product_id || '',
      quantity: item.quantity || '',
      unit: item.unit || '',
      reason: item.reason || '',
      waste_date: item.waste_date ? item.waste_date.slice(0, 10) : '',
      notes: item.notes || '',
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
      product_id: Number(form.product_id),
      quantity: Number(form.quantity),
    }
    try {
      if (editing) {
        await wasteLogsApi.update(editing.id, payload)
        toast.success('Merma actualizada')
      } else {
        await wasteLogsApi.create(payload)
        toast.success('Merma registrada')
      }
      setModalOpen(false)
      fetchLogs(page)
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

  const handleDelete = async () => {
    setSaving(true)
    try {
      await wasteLogsApi.destroy(deleteTarget.id)
      toast.success('Merma eliminada')
      setDeleteTarget(null)
      fetchLogs(page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  const reasonLabel = (r) => REASONS.find((x) => x.value === r)?.label || r || '—'

  const columns = [
    { key: 'id', label: 'ID', className: 'w-16' },
    { key: 'waste_date', label: 'Fecha', render: (r) => fmtDate(r.waste_date) },
    { key: 'product', label: 'Producto', render: (r) => r.product?.name || '—' },
    { key: 'quantity', label: 'Cantidad', render: (r) => `${r.quantity} ${r.unit || ''}`.trim() },
    { key: 'reason', label: 'Motivo', render: (r) => reasonLabel(r.reason) },
    { key: 'user', label: 'Registrado por', render: (r) => r.user?.name || '—' },
    {
      key: 'actions', label: 'Acciones', className: 'w-28 text-right',
      render: (r) => (
        <div className="action-cell">
          <button onClick={() => openEdit(r)} className="action-btn--edit">
            <Pencil className="sidebar__link-icon" />
          </button>
          <button onClick={() => setDeleteTarget(r)} className="action-btn--delete">
            <Trash2 className="sidebar__link-icon" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="page-title">Registro de Mermas</h1>
          <p className="page-subtitle">Control de desperdicios y pérdidas</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="sidebar__link-icon" /> Nueva Merma
        </button>
      </div>

      <div className="filters-bar">
        <div>
          <label className="label">Desde</label>
          <input type="date" className="input filters-bar__select" value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Hasta</label>
          <input type="date" className="input filters-bar__select" value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)} />
        </div>
        <div>
          <label className="label">Motivo</label>
          <select className="input filters-bar__select" value={filterReason}
            onChange={(e) => setFilterReason(e.target.value)}>
            <option value="">Todos</option>
            {REASONS.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
          </select>
        </div>
      </div>

      <div className="card-flush">
        <DataTable columns={columns} data={logs} loading={loading} emptyMessage="No hay mermas registradas" />
        <Pagination currentPage={page} lastPage={lastPage} onPageChange={(p) => fetchLogs(p)} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Merma' : 'Nueva Merma'} maxWidth="max-w-lg">
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form__grid-2">
            <div>
              <label className="label">Fecha *</label>
              <input type="date" className="input" value={form.waste_date}
                onChange={(e) => setForm({ ...form, waste_date: e.target.value })} required />
              {errors.waste_date && <p className="field-error">{errors.waste_date[0]}</p>}
            </div>
            <div>
              <label className="label">Motivo *</label>
              <select className="input" value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })} required>
                <option value="">Seleccionar...</option>
                {REASONS.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
              </select>
              {errors.reason && <p className="field-error">{errors.reason[0]}</p>}
            </div>
          </div>
          <div>
            <label className="label">Producto *</label>
            <select className="input" value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
              <option value="">Seleccionar producto...</option>
              {products.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
            {errors.product_id && <p className="field-error">{errors.product_id[0]}</p>}
          </div>
          <div className="admin-form__grid-2">
            <div>
              <label className="label">Cantidad *</label>
              <input type="number" step="0.01" min="0.01" className="input" value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })} required placeholder="0" />
              {errors.quantity && <p className="field-error">{errors.quantity[0]}</p>}
            </div>
            <div>
              <label className="label">Unidad</label>
              <input className="input" value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg, unidades, etc." />
            </div>
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea className="input" rows={2} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observaciones..." />
          </div>
          <div className="admin-form__actions">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Eliminar Merma"
        message={`¿Seguro que deseas eliminar este registro de merma?`}
        loading={saving}
      />
    </div>
  )
}
