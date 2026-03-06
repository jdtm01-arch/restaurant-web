import { X } from 'lucide-react'
import { useEffect } from 'react'

const sizeMap = {
  'max-w-sm': 'modal-panel--sm',
  'max-w-lg': 'modal-panel--md',
  'max-w-xl': 'modal-panel--lg',
  'max-w-2xl': 'modal-panel--xl',
}

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const panelSize = sizeMap[maxWidth] || 'modal-panel--md'

  return (
    <div className="modal-backdrop">
      <div className="modal-overlay" onClick={onClose} />
      <div className={`modal-panel ${panelSize}`}>
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button onClick={onClose} className="modal__close">
            <X className="modal__close-icon" />
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  )
}
