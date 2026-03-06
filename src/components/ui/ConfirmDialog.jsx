import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
}) {
  const btnClass = variant === 'danger' ? 'btn-danger' : 'btn-primary'

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      <div className="confirm-dialog__body">
        <div className="confirm-dialog__icon-wrapper">
          <AlertTriangle className="confirm-dialog__icon" />
        </div>
        <p className="confirm-dialog__message">{message}</p>
      </div>
      <div className="confirm-dialog__actions">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>
          {cancelText}
        </button>
        <button className={btnClass} onClick={onConfirm} disabled={loading}>
          {loading ? 'Procesando...' : confirmText}
        </button>
      </div>
    </Modal>
  )
}
