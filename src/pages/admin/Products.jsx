import { useState, useEffect } from 'react'
import { productsApi } from '../../api/products'
import { productCategoriesApi } from '../../api/productCategories'
import useCrud from '../../hooks/useCrud'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, ImageOff } from 'lucide-react'
import toast from 'react-hot-toast'

const TARGET_KB = 100
const MAX_UPLOAD_KB = 150

/**
 * Compress an image File to approx TARGET_KB using Canvas API.
 */
function compressImage(file, targetKB = TARGET_KB) {
  return new Promise((resolve) => {
    const targetBytes = targetKB * 1024
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      const maxW = 800
      const ratio = Math.min(1, maxW / img.width)
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const tryQuality = (q) => {
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return }
          if (blob.size <= targetBytes || q <= 0.1) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
          } else {
            tryQuality(Math.max(0.1, q - 0.1))
          }
        }, 'image/jpeg', q)
      }
      tryQuality(0.9)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

const emptyForm = {
  name: '',
  category_id: '',
  price_with_tax: '',
  description: '',
  image: null,
}

export default function Products() {
  const { items, loading, saving, errors, setErrors, createItem, updateItem, deleteItem, fetchItems } =
    useCrud(productsApi, { resourceName: 'Producto' })

  const [categories, setCategories] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [imagePreview, setImagePreview] = useState(null)
  const [compressing, setCompressing] = useState(false)

  useEffect(() => {
    productCategoriesApi.list().then((res) => {
      setCategories(res.data.data || [])
    })
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setImagePreview(null)
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      name: item.name || '',
      category_id: item.category_id || '',
      price_with_tax: item.price_with_tax || '',
      description: item.description || '',
      image: null,
    })
    setImagePreview(item.image_url || null)
    setErrors({})
    setModalOpen(true)
  }

  const handleImageChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('El archivo debe ser una imagen')
      return
    }
    setCompressing(true)
    try {
      const compressed = await compressImage(file, TARGET_KB)
      const finalKB = (compressed.size / 1024).toFixed(1)
      if (compressed.size > MAX_UPLOAD_KB * 1024) {
        toast.error(`La imagen comprimida pesa ${finalKB} KB. Intenta con una imagen más pequeña.`)
        return
      }
      setForm((prev) => ({ ...prev, image: compressed }))
      const reader = new FileReader()
      reader.onload = (ev) => setImagePreview(ev.target.result)
      reader.readAsDataURL(compressed)
      toast.success(`Imagen lista (${finalKB} KB)`)
    } catch {
      toast.error('Error al procesar la imagen')
    } finally {
      setCompressing(false)
    }
  }

  const handleRemoveImage = () => {
    setForm((prev) => ({ ...prev, image: null }))
    setImagePreview(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      name: form.name,
      category_id: Number(form.category_id),
      price_with_tax: Number(form.price_with_tax),
      description: form.description,
    }
    if (form.image instanceof File) {
      payload.image = form.image
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

  const handleToggle = async (item) => {
    try {
      await productsApi.toggleActive(item.id)
      toast.success(`Producto ${item.is_active ? 'desactivado' : 'activado'}`)
      fetchItems()
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  const getCategoryName = (id) => {
    const cat = categories.find((c) => c.id === id)
    return cat?.name || '—'
  }

  const columns = [
    {
      key: 'image_url',
      label: '',
      className: 'w-12',
      render: (row) =>
        row.image_url ? (
          <img src={row.image_url} alt={row.name} className="product-thumb" />
        ) : (
          <div className="product-thumb--empty">
            <ImageOff className="h-4 w-4 text-gray-300" />
          </div>
        ),
    },
    { key: 'name', label: 'Nombre' },
    {
      key: 'category_id',
      label: 'Categoría',
      render: (row) => getCategoryName(row.category_id),
    },
    {
      key: 'price_with_tax',
      label: 'Precio',
      className: 'w-24 text-right',
      render: (row) => `S/ ${Number(row.price_with_tax).toFixed(2)}`,
    },
    {
      key: 'is_active',
      label: 'Estado',
      className: 'w-24',
      render: (row) => (
        <button
          onClick={() => handleToggle(row)}
          className={row.is_active ? 'badge-toggle--active' : 'badge-toggle--inactive'}
        >
          {row.is_active ? <ToggleRight className="data-table__sort-icon" /> : <ToggleLeft className="data-table__sort-icon" />}
          {row.is_active ? 'Activo' : 'Inactivo'}
        </button>
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
          <h1 className="page-title">Productos</h1>
          <p className="page-subtitle">Gestiona los productos del menú</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="sidebar__link-icon" /> Nuevo Producto
        </button>
      </div>

      <div className="card-flush">
        <DataTable columns={columns} data={items} loading={loading} emptyMessage="No hay productos registrados" />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Producto' : 'Nuevo Producto'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="admin-form">
          <div>
            <label className="label">Nombre *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre del producto"
              required
              autoFocus
            />
            {errors.name && <p className="field-error">{errors.name[0]}</p>}
          </div>
          <div className="admin-form__grid-2">
            <div>
              <label className="label">Categoría *</label>
              <select
                className="input"
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                required
              >
                <option value="">Seleccionar...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.category_id && <p className="field-error">{errors.category_id[0]}</p>}
            </div>
            <div>
              <label className="label">Precio (con IGV) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="input"
                value={form.price_with_tax}
                onChange={(e) => setForm({ ...form, price_with_tax: e.target.value })}
                placeholder="0.00"
                required
              />
              {errors.price_with_tax && <p className="field-error">{errors.price_with_tax[0]}</p>}
            </div>
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descripción opcional del producto..."
            />
          </div>

          {/* Image upload */}
          <div>
            <label className="label">Imagen del producto</label>
            {imagePreview && (
              <div className="product-image-preview">
                <img src={imagePreview} alt="Vista previa" />
                <button
                  type="button"
                  className="product-image-preview__remove"
                  onClick={handleRemoveImage}
                >
                  Quitar imagen
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="input mt-1"
              onChange={handleImageChange}
              disabled={compressing}
            />
            <p className="field-hint">
              {compressing
                ? 'Comprimiendo imagen...'
                : 'Máx. 100 KB · JPEG, PNG, WebP (se comprime automáticamente)'}
            </p>
            {errors.image && <p className="field-error">{errors.image[0]}</p>}
          </div>

          <div className="admin-form__actions">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving || compressing}>
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar Producto"
        message={`¿Seguro que deseas eliminar "${deleteTarget?.name}"?`}
        loading={saving}
      />
    </div>
  )
}
