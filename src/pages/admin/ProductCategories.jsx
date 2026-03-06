import { useState } from 'react'
import { productCategoriesApi } from '../../api/productCategories'
import useCrud from '../../hooks/useCrud'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function ProductCategories() {
  const { items, loading, saving, errors, setErrors, createItem, updateItem, deleteItem } =
    useCrud(productCategoriesApi, { resourceName: 'Categoría' })

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '' })

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '' })
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({ name: item.name })
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
          <h1 className="page-title">Categorías de Productos</h1>
          <p className="page-subtitle">Gestiona las categorías del menú</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="sidebar__link-icon" /> Nueva Categoría
        </button>
      </div>

      <div className="card-flush">
        <DataTable columns={columns} data={items} loading={loading} emptyMessage="No hay categorías registradas" />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Categoría' : 'Nueva Categoría'}
      >
        <form onSubmit={handleSubmit} className="admin-form">
          <div>
            <label className="label">Nombre</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Entradas, Bebidas..."
              required
              autoFocus
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

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar Categoría"
        message={`¿Seguro que deseas eliminar "${deleteTarget?.name}"?`}
        loading={saving}
      />
    </div>
  )
}
