import { useState } from 'react'
import { financialAccountsApi } from '../../api/financialAccounts'
import useCrud from '../../hooks/useCrud'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'bank', label: 'Banco' },
  { value: 'digital', label: 'Digital' },
  { value: 'pos', label: 'POS' },
]

const TYPE_LABELS = { cash: 'Efectivo', bank: 'Banco', digital: 'Digital', pos: 'POS' }

const emptyForm = { name: '', type: 'cash', currency: 'PEN', is_active: true }

export default function FinancialAccounts() {
  const { items, loading, saving, errors, setErrors, createItem, updateItem, deleteItem } =
    useCrud(financialAccountsApi, { resourceName: 'Cuenta Financiera' })

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      name: item.name,
      type: item.type,
      currency: item.currency || 'PEN',
      is_active: !!item.is_active,
    })
    setErrors({})
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const ok = editing
      ? await updateItem(editing.id, form)
      : await createItem(form)
    if (ok) setModalOpen(false)
  }

  const handleDelete = async () => {
    const ok = await deleteItem(deleteTarget.id)
    if (ok) setDeleteTarget(null)
  }

  const columns = [
    { key: 'id', label: 'ID', className: 'w-16' },
    { key: 'name', label: 'Nombre' },
    {
      key: 'type',
      label: 'Tipo',
      className: 'w-28',
      render: (row) => (
        <span className="badge--muted">
          {TYPE_LABELS[row.type] || row.type}
        </span>
      ),
    },
    { key: 'currency', label: 'Moneda', className: 'w-20' },
    {
      key: 'is_active',
      label: 'Estado',
      className: 'w-24',
      render: (row) => (
        <span className={row.is_active ? 'badge--success' : 'badge--muted'}>
          {row.is_active ? 'Activa' : 'Inactiva'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      className: 'w-28 text-right',
      render: (row) => (
        <div className="action-cell">
          <button onClick={() => openEdit(row)} className="action-btn--edit">
            <Pencil className="sidebar__link-icon" />
          </button>
          <button onClick={() => setDeleteTarget(row)} className="action-btn--delete">
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
          <h1 className="page-title">Cuentas Financieras</h1>
          <p className="page-subtitle">Gestiona las cuentas donde se registran ingresos y egresos</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="sidebar__link-icon" /> Nueva Cuenta
        </button>
      </div>

      <div className="card-flush">
        <DataTable columns={columns} data={items} loading={loading} emptyMessage="No hay cuentas financieras registradas" />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Cuenta Financiera' : 'Nueva Cuenta Financiera'}
      >
        <form onSubmit={handleSubmit} className="admin-form">
          <div>
            <label className="label">Nombre</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Caja Física, Yape, Cuenta BCP..."
              required
              autoFocus
            />
            {errors.name && <p className="field-error">{errors.name[0]}</p>}
          </div>

          <div>
            <label className="label">Tipo</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              required
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {errors.type && <p className="field-error">{errors.type[0]}</p>}
          </div>

          <div>
            <label className="label">Moneda</label>
            <select
              className="input"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              <option value="PEN">PEN</option>
              <option value="USD">USD</option>
            </select>
            {errors.currency && <p className="field-error">{errors.currency[0]}</p>}
          </div>

          {editing && (
            <div>
              <div className="checkbox-row">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="checkbox"
                />
                <label htmlFor="is_active" className="checkbox-label">Activa</label>
              </div>
              {errors.is_active && <p className="field-error mt-1">{errors.is_active[0]}</p>}
            </div>
          )}

          <div className="admin-form__actions">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar Cuenta Financiera"
        message={`¿Seguro que deseas eliminar "${deleteTarget?.name}"? No se puede si tiene movimientos asociados.`}
        loading={saving}
      />
    </div>
  )
}
