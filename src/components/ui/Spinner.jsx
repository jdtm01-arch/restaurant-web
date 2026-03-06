import { Loader2 } from 'lucide-react'

const sizeClass = {
  sm: 'spinner--sm',
  md: 'spinner--md',
  lg: 'spinner--lg',
}

export default function Spinner({ size = 'md', className = '' }) {
  return (
    <Loader2 className={`spinner ${sizeClass[size]} ${className}`} />
  )
}
