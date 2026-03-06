import { useState, useEffect, useCallback, useRef } from 'react'
import { ordersApi } from '../../api/orders'
import Spinner from '../../components/ui/Spinner'
import { RefreshCw, Clock, Printer } from 'lucide-react'
import toast from 'react-hot-toast'

const REFRESH_INTERVAL = 30000 // 30 seconds

export default function KitchenDisplay() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)
  const intervalRef = useRef(null)

  const fetchOrders = useCallback(async () => {
    try {
      const res = await ordersApi.list({ status: 'open', per_page: 50 })
      setOrders(res.data.data || [])
      setLastRefresh(new Date())
    } catch {
      // silent — kitchen display should keep working
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    intervalRef.current = setInterval(fetchOrders, REFRESH_INTERVAL)
    return () => clearInterval(intervalRef.current)
  }, [fetchOrders])

  const handlePrintTicket = async (order) => {
    try {
      const res = await ordersApi.kitchenTicket(order.id)
      const text = res.data.data?.text || 'Sin contenido'
      const w = window.open('', '_blank', 'width=350,height=600')
      w.document.write(`<pre style="font-family:monospace;font-size:12px;">${text}</pre>`)
      w.document.close()
      w.print()
    } catch {
      toast.error('Error al imprimir ticket')
    }
  }

  const timeSince = (dateStr) => {
    if (!dateStr) return ''
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (diff < 1) return 'Ahora'
    if (diff < 60) return `${diff} min`
    return `${Math.floor(diff / 60)}h ${diff % 60}m`
  }

  if (loading) {
    return (
      <div className="data-table__loading" style={{ minHeight: '60vh' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="page-title">Cocina</h1>
          <p className="page-subtitle">
            {orders.length} pedido{orders.length !== 1 ? 's' : ''} pendiente{orders.length !== 1 ? 's' : ''}
            {lastRefresh && ` · Actualizado ${lastRefresh.toLocaleTimeString('es-PE')}`}
          </p>
        </div>
        <button onClick={fetchOrders} className="btn-secondary">
          <RefreshCw className="sidebar__link-icon" /> Refrescar
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="kitchen-empty">
          <p className="kitchen-empty__text">No hay pedidos pendientes</p>
        </div>
      ) : (
        <div className="kitchen-grid">
          {orders.map((order) => (
            <div key={order.id} className="kitchen-card">
              <div className="kitchen-card__header">
                <div>
                  <span className="kitchen-card__id">#{order.id}</span>
                  <span className="kitchen-card__channel">
                    {order.channel === 'dine_in' ? 'Salón' : order.channel === 'takeaway' ? 'Llevar' : 'Delivery'}
                  </span>
                </div>
                <div className="kitchen-card__meta">
                  <span className="kitchen-card__time">
                    <Clock className="sidebar__link-icon" /> {timeSince(order.opened_at)}
                  </span>
                  <button onClick={() => handlePrintTicket(order)} className="action-btn--edit" title="Imprimir">
                    <Printer className="sidebar__link-icon" />
                  </button>
                </div>
              </div>
              {order.table && (
                <p className="kitchen-card__table">{order.table.name}</p>
              )}
              <div className="kitchen-card__items">
                {(order.items || []).map((item) => (
                  <div key={item.id} className="kitchen-card__item">
                    <span className="kitchen-card__item-qty">{item.quantity}×</span>
                    <span>{item.product_name || `Producto #${item.product_id}`}</span>
                  </div>
                ))}
              </div>
              {order.user && (
                <p className="kitchen-card__waiter">Mesero: {order.user.name}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
