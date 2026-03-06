import { useState, useEffect } from 'react'
import { usersApi } from '../../api/users'
import { catalogsApi } from '../../api/catalogs'
import useCrud from '../../hooks/useCrud'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { Plus, Pencil, Trash2, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

const emptyForm = { name: '', email: '', password: '', role_id: '' }

export default function Users() {
  const { currentRole } = useAuth()
  const isAdminGeneral = currentRole === 'admin_general'
  const { items, loading, saving, errors, setErrors, createItem, updateItem, deleteItem, fetchItems } =
    useCrud(usersApi, { resourceName: 'Usuario' })

  const [roles, setRoles] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [passwordModal, setPasswordModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [newPassword, setNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    catalogsApi.roles().then((res) => {
      let allRoles = res.data.data || []
      // admin_restaurante cannot assign admin_general role
      if (!isAdminGeneral) {
        allRoles = allRoles.filter((r) => r.slug !== 'admin_general')
      }
      setRoles(allRoles)
    })
  }, [isAdminGeneral])

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
      email: item.email || '',
      password: '',
      role_id: item.role?.id || '',
    })
    setErrors({})
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    let payload
    if (editing) {
      payload = {
        name: form.name,
        email: form.email,
        role_id: Number(form.role_id),
      }
    } else {
      payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role_id: Number(form.role_id),
      }
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

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setPasswordSaving(true)
    try {
      const res = await usersApi.resetPassword(passwordModal.id, { password: newPassword })
      toast.success(res.data.message || 'Contraseña actualizada')
      setPasswordModal(null)
      setNewPassword('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al resetear contraseña')
    } finally {
      setPasswordSaving(false)
    }
  }

  const columns = [
    { key: 'id', label: 'ID', className: 'w-16' },
    { key: 'name', label: 'Nombre' },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Rol',
      className: 'w-36',
      render: (row) => (
        <span className="badge--primary">
          {row.role?.name || '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      className: 'w-36 text-right',
      render: (row) => {
        const isTargetAdminGeneral = row.role?.slug === 'admin_general'
        const canModify = isAdminGeneral || !isTargetAdminGeneral
        if (!canModify) return null
        return (
          <div className="action-cell">
            <button
              onClick={() => setPasswordModal(row)}
              className="action-btn--warning"
              title="Resetear contraseña"
            >
              <KeyRound className="sidebar__link-icon" />
            </button>
            <button onClick={() => openEdit(row)} className="action-btn--edit">
              <Pencil className="sidebar__link-icon" />
            </button>
            <button onClick={() => setDeleteTarget(row)} className="action-btn--delete">
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
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">Gestiona los usuarios del restaurante</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="sidebar__link-icon" /> Nuevo Usuario
        </button>
      </div>

      <div className="card-flush">
        <DataTable columns={columns} data={items} loading={loading} emptyMessage="No hay usuarios registrados" />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Usuario' : 'Nuevo Usuario'}
      >
        <form onSubmit={handleSubmit} className="admin-form">
          <div>
            <label className="label">Nombre *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre completo"
              required
              autoFocus
            />
            {errors.name && <p className="field-error">{errors.name[0]}</p>}
          </div>
          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="usuario@email.com"
              required
            />
            {errors.email && <p className="field-error">{errors.email[0]}</p>}
          </div>
          {!editing && (
            <div>
              <label className="label">Contraseña *</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
              />
              {errors.password && <p className="field-error">{errors.password[0]}</p>}
            </div>
          )}
          <div>
            <label className="label">Rol *</label>
            <select
              className="input"
              value={form.role_id}
              onChange={(e) => setForm({ ...form, role_id: e.target.value })}
              required
            >
              <option value="">Seleccionar rol...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            {errors.role_id && <p className="field-error">{errors.role_id[0]}</p>}
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

      {/* Reset password modal */}
      <Modal
        open={!!passwordModal}
        onClose={() => { setPasswordModal(null); setNewPassword('') }}
        title="Resetear Contraseña"
        maxWidth="max-w-sm"
      >
        <div className="admin-form">
          <p className="page-subtitle">
            Nueva contraseña para <strong>{passwordModal?.name}</strong>
          </p>
          <div>
            <label className="label">Nueva contraseña</label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              autoFocus
            />
          </div>
          <div className="admin-form__actions">
            <button
              className="btn-secondary"
              onClick={() => { setPasswordModal(null); setNewPassword('') }}
            >
              Cancelar
            </button>
            <button
              className="btn-primary"
              onClick={handleResetPassword}
              disabled={passwordSaving}
            >
              {passwordSaving ? 'Guardando...' : 'Actualizar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar Usuario"
        message={`¿Seguro que deseas desasociar "${deleteTarget?.name}" del restaurante?`}
        loading={saving}
      />
    </div>
  )
}
