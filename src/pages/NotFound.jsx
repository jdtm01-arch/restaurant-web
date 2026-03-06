import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="not-found">
      <h1 className="not-found__code">404</h1>
      <p className="not-found__text">Página no encontrada</p>
      <Link to="/dashboard" className="not-found__link">
        Volver al inicio
      </Link>
    </div>
  )
}
