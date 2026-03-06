import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react'

const variants = {
  error:   { cls: 'alert--error',   Icon: XCircle },
  success: { cls: 'alert--success', Icon: CheckCircle },
  warning: { cls: 'alert--warning', Icon: AlertCircle },
  info:    { cls: 'alert--info',    Icon: Info },
}

export default function Alert({ variant = 'info', children, className = '' }) {
  const v = variants[variant]
  return (
    <div className={`${v.cls} ${className}`}>
      <v.Icon className="alert__icon" />
      <div className="alert__text">{children}</div>
    </div>
  )
}
