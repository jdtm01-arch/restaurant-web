import { useState } from 'react'
import { paymentMethodsApi } from '../../api/paymentMethods'
import useCrud from '../../hooks/useCrud'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function PaymentMethods() {
  const { items, loading, saving, errors, setErrors, createItem, updateItem, deleteItem } =
    useCrud(paymentMethodsApi, { resourceName: 'Método de Pago' })

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', active: true })

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', active: true })
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({ name: item.name, active: !!item.active })
    setErrors({})
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const ok = editing
      ? await updateItem(editing.id, form)
      : await createItem({ name: form.name })
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
      key: 'active',
      label: 'Estado',
      className: 'w-24',
      render: (row) => (
        <span className={row.active ? 'badge--success' : 'badge--muted'}>
          {row.active ? 'Activo' : 'Inactivo'}
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
          <h1 className="page-title">Métodos de Pago</h1>
          <p className="page-subtitle">Gestiona los métodos de pago disponibles</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="sidebar__link-icon" /> Nuevo Método
        </button>
      </div>

      <div className="card-flush">
        <DataTable columns={columns} data={items} loading={loading} emptyMessage="No hay métodos de pago registrados" />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
      >
        <form onSubmit={handleSubmit} className="admin-form">
          <div>
            <label className="label">Nombre</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Efectivo, Tarjeta, Transferencia..."
              required
              autoFocus
            />
            {errors.name && <p className="field-error">{errors.name[0]}</p>}
          </div>
          {editing && (
            <div className="checkbox-row">
              <input
                type="checkbox"
                id="active"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="checkbox"
              />
              <label htmlFor="active" className="checkbox-label">Activo</label>
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
        title="Eliminar Método de Pago"
        message={`¿Seguro que deseas eliminar "${deleteTarget?.name}"? No se puede si tiene pagos asociados.`}
        loading={saving}
      />
    </div>
  )
}
