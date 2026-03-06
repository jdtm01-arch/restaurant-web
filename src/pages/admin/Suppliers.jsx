import { useState } from 'react'
import { suppliersApi } from '../../api/suppliers'
import useCrud from '../../hooks/useCrud'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const emptyForm = { name: '', ruc: '', phone: '', email: '', contact_person: '', description: '' }

export default function Suppliers() {
  const { items, loading, saving, errors, setErrors, createItem, updateItem, deleteItem } =
    useCrud(suppliersApi, { resourceName: 'Proveedor' })

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
      name: item.name || '',
      ruc: item.ruc || '',
      phone: item.phone || '',
      email: item.email || '',
      contact_person: item.contact_person || '',
      description: item.description || '',
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
    { key: 'ruc', label: 'RUC', className: 'w-32' },
    { key: 'phone', label: 'Teléfono', className: 'w-28' },
    { key: 'contact_person', label: 'Contacto' },
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
          <h1 className="page-title">Proveedores</h1>
          <p className="page-subtitle">Gestiona los proveedores del sistema</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="sidebar__link-icon" /> Nuevo Proveedor
        </button>
      </div>

      <div className="card-flush">
        <DataTable columns={columns} data={items} loading={loading} emptyMessage="No hay proveedores registrados" />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form__grid-2">
            <div>
              <label className="label">Nombre *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nombre del proveedor"
                required
                autoFocus
              />
              {errors.name && <p className="field-error">{errors.name[0]}</p>}
            </div>
            <div>
              <label className="label">RUC *</label>
              <input
                className="input"
                value={form.ruc}
                onChange={(e) => setForm({ ...form, ruc: e.target.value })}
                placeholder="20XXXXXXXXX"
                required
              />
              {errors.ruc && <p className="field-error">{errors.ruc[0]}</p>}
            </div>
          </div>
          <div className="admin-form__grid-2">
            <div>
              <label className="label">Teléfono</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="999888777"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="proveedor@email.com"
              />
            </div>
          </div>
          <div>
            <label className="label">Persona de contacto</label>
            <input
              className="input"
              value={form.contact_person}
              onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
              placeholder="Nombre del contacto"
            />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Notas sobre el proveedor..."
            />
          </div>
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

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar Proveedor"
        message={`¿Seguro que deseas eliminar "${deleteTarget?.name}"? No se puede si tiene gastos asociados.`}
        loading={saving}
      />
    </div>
  )
}
