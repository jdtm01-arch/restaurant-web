import { useState } from 'react'
import { tablesApi } from '../../api/tables'
import useCrud from '../../hooks/useCrud'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function Tables() {
  const { items, loading, saving, errors, setErrors, createItem, updateItem, deleteItem } =
    useCrud(tablesApi, { resourceName: 'Mesa' })

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ number: '', name: '', capacity: '' })

  const openCreate = () => {
    setEditing(null)
    setForm({ number: '', name: '', capacity: '' })
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      number: item.number || '',
      name: item.name || '',
      capacity: item.capacity || '',
    })
    setErrors({})
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      number: Number(form.number),
      name: form.name,
      ...(form.capacity ? { capacity: Number(form.capacity) } : {}),
    }
    const ok = editing
      ? await updateItem(editing.id, payload)
      : await createItem(payload)
    if (ok) setModalOpen(false)
  }

  const handleDelete = async () => {
    const ok = await deleteItem(deleteTarget.id)
    if (ok) setDeleteTarget(null)
  }

  const columns = [
    { key: 'id', label: 'ID', className: 'w-16' },
    { key: 'number', label: 'Número', className: 'w-20' },
    { key: 'name', label: 'Nombre' },
    { key: 'capacity', label: 'Capacidad', className: 'w-24' },
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
          <h1 className="page-title">Mesas</h1>
          <p className="page-subtitle">Gestiona las mesas del restaurante</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="sidebar__link-icon" /> Nueva Mesa
        </button>
      </div>

      <div className="card-flush">
        <DataTable columns={columns} data={items} loading={loading} emptyMessage="No hay mesas registradas" />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Mesa' : 'Nueva Mesa'}
      >
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form__grid-2">
            <div>
              <label className="label">Número</label>
              <input
                type="number"
                className="input"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                placeholder="1"
                required
                min="1"
                autoFocus
              />
              {errors.number && <p className="field-error">{errors.number[0]}</p>}
            </div>
            <div>
              <label className="label">Capacidad</label>
              <input
                type="number"
                className="input"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                placeholder="4"
                min="1"
              />
              {errors.capacity && <p className="field-error">{errors.capacity[0]}</p>}
            </div>
          </div>
          <div>
            <label className="label">Nombre / Descripción</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Mesa Principal, Terraza..."
              required
            />
            {errors.name && <p className="field-error">{errors.name[0]}</p>}
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
        title="Eliminar Mesa"
        message={`¿Seguro que deseas eliminar "${deleteTarget?.name}"?`}
        loading={saving}
      />
    </div>
  )
}
