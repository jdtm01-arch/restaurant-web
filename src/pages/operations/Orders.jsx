import { useState, useEffect, useCallback } from 'react'
import { ordersApi } from '../../api/orders'
import { productsApi } from '../../api/products'
import { catalogsApi } from '../../api/catalogs'
import { tablesApi } from '../../api/tables'
import { salesApi } from '../../api/sales'
import { cashRegistersApi } from '../../api/cashRegisters'
import { financialAccountsApi } from '../../api/financialAccounts'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Pagination from '../../components/ui/Pagination'
import TableMap from '../../components/TableMap'
import ProductSearch from '../../components/ui/ProductSearch'
import { Plus, Eye, X, Printer, CreditCard, Percent, Minus, PlusCircle, LayoutGrid, List, Trash2, ArrowRightLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

const STATUS_MAP = {
  open: { label: 'Abierta', css: 'badge--success' },
  closed: { label: 'Cerrada', css: 'badge--warning' },
  paid: { label: 'Pagada', css: 'badge--primary' },
  cancelled: { label: 'Cancelada', css: 'badge--danger' },
}

const CHANNELS = [
  { value: 'dine_in', label: 'Salón' },
  { value: 'takeaway', label: 'Para llevar' },
  { value: 'delivery', label: 'Delivery' },
]

export default function Orders() {
  const { currentRole, user } = useAuth()
  const canPayOrDiscount = ['admin_general', 'admin_restaurante', 'caja'].includes(currentRole)
  const [view, setView] = useState('map') // 'map' | 'list'
  const [orders, setOrders] = useState([])
  const [activeOrders, setActiveOrders] = useState([]) // open+closed for map
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterChannel, setFilterChannel] = useState('')

  // Products and tables for order creation
  const [products, setProducts] = useState([])
  const [tables, setTables] = useState([])

  // Modals
  const [createModal, setCreateModal] = useState(false)
  const [detailModal, setDetailModal] = useState(null)
  const [payModal, setPayModal] = useState(null)
  const [payConfirmOpen, setPayConfirmOpen] = useState(false)
  const [receiptModal, setReceiptModal] = useState(null) // { saleId, text }
  const [cancelModal, setCancelModal] = useState(null)
  const [discountModal, setDiscountModal] = useState(null)
  const [closeConfirm, setCloseConfirm] = useState(null)
  const [commandaModal, setCommandaModal] = useState(null) // { orderId, text }
  const [saving, setSaving] = useState(false)

  // Post-creation confirm flow
  const [postCreateOrder, setPostCreateOrder] = useState(null)

  // Table change flow
  const [changeTableOpen, setChangeTableOpen] = useState(false)
  const [selectedNewTable, setSelectedNewTable] = useState('')
  const [changeTableConfirm, setChangeTableConfirm] = useState(false)

  // Add-item form for open orders (inside detail modal)
  const [addItemForm, setAddItemForm] = useState({ product_id: '', quantity: 1 })

  // Create form
  const [newChannel, setNewChannel] = useState('takeaway')
  const [newTableId, setNewTableId] = useState('')
  const [newItems, setNewItems] = useState([])

  // Pay form
  const [paymentMethods, setPaymentMethods] = useState([])
  const [financialAccounts, setFinancialAccounts] = useState([])
  const [payments, setPayments] = useState([{ payment_method_id: '', financial_account_id: '', amount: '' }])

  // Cancel form
  const [cancelReason, setCancelReason] = useState('')

  // Cash register check
  const [currentCashRegister, setCurrentCashRegister] = useState(null)
  const [cajaChecked, setCajaChecked] = useState(false)

  // Discount form
  const [discountPct, setDiscountPct] = useState('')

  const fetchOrders = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p }
      if (filterStatus) params.status = filterStatus
      if (filterChannel) params.channel = filterChannel
      const res = await ordersApi.list(params)
      setOrders(res.data.data || [])
      setPage(res.data.current_page || 1)
      setLastPage(res.data.last_page || 1)
    } catch {
      toast.error('Error al cargar pedidos')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterChannel])

  // Fetch open + closed orders (for the table map status overlay)
  const fetchActiveOrders = useCallback(async () => {
    try {
      const [openRes, closedRes] = await Promise.all([
        ordersApi.list({ status: 'open', per_page: 100 }),
        ordersApi.list({ status: 'closed', per_page: 100 }),
      ])
      setActiveOrders([
        ...(openRes.data.data || []),
        ...(closedRes.data.data || []),
      ])
    } catch { /* silently fail */ }
  }, [])

  useEffect(() => {
    fetchOrders()
    fetchActiveOrders()
  }, [fetchOrders, fetchActiveOrders])

  const fetchTables = useCallback(() => {
    tablesApi.list().then((res) => setTables((res.data.data || []).filter((t) => t.is_active !== false))).catch(() => {})
  }, [])

  useEffect(() => {
    productsApi.list().then((res) => setProducts(res.data.data || [])).catch(() => {})
    catalogsApi.paymentMethods().then((res) => setPaymentMethods(res.data.data || [])).catch(() => {})
    if (canPayOrDiscount) {
      financialAccountsApi.list().then((res) => setFinancialAccounts((res.data.data || []).filter((a) => a.is_active))).catch(() => {})
    }
    fetchTables()
    cashRegistersApi.current()
      .then((r) => setCurrentCashRegister(r.data.data))
      .catch(() => setCurrentCashRegister(null))
      .finally(() => setCajaChecked(true))
  }, [fetchTables, canPayOrDiscount])

  const fmtMoney = (v) => v != null ? `S/ ${Number(v).toFixed(2)}` : '—'
  const fmtDateTime = (v) => v ? new Date(v).toLocaleString('es-PE') : '—'

  /* ── TABLE MAP CLICK ── */
  const handleTableClick = (table) => {
    // Find if there's an active order for this table
    const order = activeOrders.find((o) => o.table_id === table.id && (o.status === 'open' || o.status === 'closed'))
    if (order) {
      // Open existing order detail
      showDetail(order.id)
    } else {
      // Guard: no open cash register
      if (!currentCashRegister) {
        toast.error('No hay caja abierta. Abre la caja antes de registrar un pedido.')
        return
      }
      // Open create modal pre-filled for this table
      setNewChannel('dine_in')
      setNewTableId(String(table.id))
      setNewItems([{ product_id: '', quantity: 1 }])
      setCreateModal(true)
    }
  }

  const refreshAll = async () => {
    await Promise.all([fetchOrders(), fetchActiveOrders()])
  }

  /* ── CREATE ── */
  const openCreateModal = () => {
    if (!currentCashRegister) {
      toast.error('No hay caja abierta. Abre la caja antes de registrar un pedido.')
      return
    }
    setNewChannel('takeaway')
    setNewTableId('')
    setNewItems([{ product_id: '', quantity: 1 }])
    setCreateModal(true)
  }

  const addNewItem = () => setNewItems([...newItems, { product_id: '', quantity: 1 }])
  const removeNewItem = (idx) => setNewItems(newItems.filter((_, i) => i !== idx))
  const updateNewItem = (idx, field, value) => {
    const copy = [...newItems]
    copy[idx] = { ...copy[idx], [field]: value }
    setNewItems(copy)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    const items = newItems.filter((it) => it.product_id)
    if (items.length === 0) { toast.error('Agrega al menos un producto'); return }
    setSaving(true)
    try {
      const payload = {
        channel: newChannel,
        items: items.map((it) => ({ product_id: Number(it.product_id), quantity: Number(it.quantity) })),
      }
      if (newChannel === 'dine_in' && newTableId) payload.table_id = Number(newTableId)
      const res = await ordersApi.create(payload)
      toast.success(res.data.message || 'Pedido creado')
      setCreateModal(false)
      refreshAll()
      // Ask user if they want to confirm the order and print comanda
      const createdOrder = res.data.data
      if (createdOrder?.id) {
        setPostCreateOrder(createdOrder)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Error al crear pedido')
    } finally {
      setSaving(false)
    }
  }

  /* ── DETAIL ── */
  const showDetail = async (id) => {
    try {
      const res = await ordersApi.show(id)
      setDetailModal(res.data.data)
    } catch {
      toast.error('Error al cargar detalle')
    }
  }

  /* ── CLOSE ORDER ── */
  const handleCloseOrder = async (order) => {
    try {
      const res = await ordersApi.close(order.id)
      toast.success(res.data.message || 'Orden cerrada')
      refreshAll()
      if (detailModal?.id === order.id) {
        setDetailModal(res.data.data)
      }
      // Fetch and show kitchen ticket (comanda)
      try {
        const ticketRes = await ordersApi.kitchenTicket(order.id)
        const text = ticketRes.data.data?.text || ''
        if (text) setCommandaModal({ orderId: order.id, text })
      } catch { /* non-critical */ }
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Error al cerrar orden')
    }
  }

  /* ── CANCEL ── */
  const handleCancel = async () => {
    if (!cancelModal) return
    setSaving(true)
    try {
      const res = await ordersApi.cancel(cancelModal.id, { cancellation_reason: cancelReason })
      toast.success(res.data.message || 'Orden cancelada')
      setCancelModal(null)
      setCancelReason('')
      refreshAll()
      if (detailModal?.id === cancelModal.id) setDetailModal(null)
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Error al cancelar')
    } finally {
      setSaving(false)
    }
  }

  /* ── DISCOUNT ── */
  const handleDiscount = async (e) => {
    e.preventDefault()
    if (!discountModal) return
    setSaving(true)
    try {
      const res = await ordersApi.applyDiscount(discountModal.id, {
        discount_percentage: Number(discountPct),
      })
      toast.success(res.data.message || 'Descuento aplicado')
      setDiscountModal(null)
      setDiscountPct('')
      refreshAll()
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Error al aplicar descuento')
    } finally {
      setSaving(false)
    }
  }

  /* ── PAY ── */
  const defaultAccountId = () => {
    const cash = financialAccounts.find((a) => a.type === 'cash')
    return cash ? String(cash.id) : ''
  }
  const newPaymentLine = (amount = '') => ({ payment_method_id: '', financial_account_id: defaultAccountId(), amount })
  const addPaymentLine = () => setPayments([...payments, newPaymentLine()])
  const removePaymentLine = (idx) => setPayments(payments.filter((_, i) => i !== idx))
  const updatePayment = (idx, field, value) => {
    const copy = [...payments]
    copy[idx] = { ...copy[idx], [field]: value }
    setPayments(copy)
  }

  const handlePay = async (e) => {
    e.preventDefault()
    if (!payModal) return
    const validPayments = payments.filter((p) => p.payment_method_id && p.financial_account_id && p.amount)
    if (validPayments.length === 0) { toast.error('Agrega al menos un pago completo'); return }
    // Show confirmation before processing
    setPayConfirmOpen(true)
  }

  const handlePayConfirmed = async () => {
    if (!payModal) return
    const validPayments = payments.filter((p) => p.payment_method_id && p.financial_account_id && p.amount)
    setSaving(true)
    try {
      const res = await ordersApi.pay(payModal.id, {
        payments: validPayments.map((p) => ({
          payment_method_id: Number(p.payment_method_id),
          amount: Number(p.amount),
          financial_account_id: Number(p.financial_account_id),
        })),
      })
      toast.success(res.data.message || 'Pago registrado')
      const sale = res.data.data
      const paidOrder = payModal
      setPayConfirmOpen(false)
      setPayModal(null)
      setPayments([newPaymentLine()])
      refreshAll()
      if (detailModal?.id === paidOrder.id) setDetailModal(null)
      // Fetch real receipt from backend and show it
      if (sale?.id) {
        try {
          const receiptRes = await salesApi.receipt(sale.id)
          const text = receiptRes.data.data?.text || ''
          setReceiptModal({ saleId: sale.id, text })
        } catch {
          setReceiptModal({ saleId: sale.id, text: `Pago registrado — Venta #${sale.id}` })
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Error al pagar')
      setPayConfirmOpen(false)
    } finally {
      setSaving(false)
    }
  }

  /* ── REMOVE ITEM FROM ORDER ── */
  const handleRemoveItem = async (orderId, itemId) => {
    setSaving(true)
    try {
      await ordersApi.removeItem(orderId, itemId)
      const res = await ordersApi.show(orderId)
      setDetailModal(res.data.data)
      refreshAll()
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Error al eliminar ítem')
    } finally {
      setSaving(false)
    }
  }

  /* ── ADD ITEM TO OPEN ORDER ── */
  const handleAddItem = async (orderId) => {
    if (!addItemForm.product_id) { toast.error('Selecciona un producto'); return }
    setSaving(true)
    try {
      await ordersApi.addItem(orderId, {
        product_id: Number(addItemForm.product_id),
        quantity: Number(addItemForm.quantity) || 1,
      })
      setAddItemForm({ product_id: '', quantity: 1 })
      // Refresh detail modal
      const res = await ordersApi.show(orderId)
      setDetailModal(res.data.data)
      refreshAll()
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Error al agregar ítem')
    } finally {
      setSaving(false)
    }
  }

  /* ── KITCHEN TICKET ── */
  const handleKitchenTicket = async (order) => {
    try {
      const res = await ordersApi.kitchenTicket(order.id)
      const text = res.data.data?.text || 'Sin contenido'
      // Open in new window for printing
      const w = window.open('', '_blank', 'width=350,height=600')
      w.document.write(`<pre style="font-family:monospace;font-size:12px;">${text}</pre>`)
      w.document.close()
      w.print()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al generar ticket')
    }
  }

  /* ── PRINT BILL (Cuenta) ── */
  const handlePrintBill = async (order) => {
    try {
      const res = await ordersApi.bill(order.id)
      const text = res.data.data?.text || 'Sin contenido'
      const w = window.open('', '_blank', 'width=350,height=600')
      w.document.write(`<pre style="font-family:monospace;font-size:12px;padding:16px">${text}</pre>`)
      w.document.close()
      w.print()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al generar cuenta')
    }
  }

  /* ── REOPEN ORDER ── */
  const handleReopen = async (order) => {
    try {
      const res = await ordersApi.reopen(order.id)
      toast.success(res.data.message || 'Orden reabierta')
      refreshAll()
      if (detailModal?.id === order.id) {
        setDetailModal(res.data.data)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Error al reabrir orden')
    }
  }

  /* ── CHANGE TABLE ── */
  const handleChangeTable = async () => {
    if (!detailModal || !selectedNewTable) return
    setSaving(true)
    try {
      const res = await ordersApi.changeTable(detailModal.id, { table_id: Number(selectedNewTable) })
      toast.success(res.data.message || 'Mesa cambiada')
      const oldId = Number(res.data.meta?.old_table_id)
      const newId = Number(res.data.meta?.new_table_id)
      setDetailModal(null)
      setChangeTableOpen(false)
      setChangeTableConfirm(false)
      setSelectedNewTable('')
      setView('map')
      await refreshAll()
      // Bypass React entirely: dispatch a DOM event so TableMap animates directly
      if (oldId && newId) {
        console.log('[TableTransfer] dispatching event', { from: oldId, to: newId })
        window.dispatchEvent(new CustomEvent('table-transfer', { detail: { from: oldId, to: newId } }))
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Error al cambiar mesa')
      setChangeTableConfirm(false)
    } finally {
      setSaving(false)
    }
  }

  const channelLabel = (ch) => CHANNELS.find((c) => c.value === ch)?.label || ch

  const columns = [
    { key: 'id', label: 'ID', className: 'w-16' },
    {
      key: 'status', label: 'Estado', className: 'w-28',
      render: (r) => {
        const s = STATUS_MAP[r.status] || { label: r.status, css: 'badge--muted' }
        return <span className={s.css}>{s.label}</span>
      },
    },
    { key: 'channel', label: 'Canal', render: (r) => channelLabel(r.channel) },
    { key: 'table', label: 'Mesa', render: (r) => r.table?.name || '—' },
    { key: 'total', label: 'Total', render: (r) => fmtMoney(r.total) },
    { key: 'items_count', label: 'Items', render: (r) => r.items?.length || 0 },
    { key: 'opened_at', label: 'Abierta', render: (r) => fmtDateTime(r.opened_at) },
    {
      key: 'actions', label: 'Acciones', className: 'w-44 text-right',
      render: (r) => (
        <div className="action-cell">
          <button onClick={() => showDetail(r.id)} className="action-btn--edit" title="Ver">
            <Eye className="sidebar__link-icon" />
          </button>
          {r.status === 'open' && (
            <button onClick={() => setCloseConfirm(r)} className="action-btn--warning" title="Confirmar">
              <X className="sidebar__link-icon" />
            </button>
          )}
          {r.status === 'closed' && (
            <>
              {canPayOrDiscount && (
                <button onClick={() => { setPayModal(r); setPayments([newPaymentLine(String(r.total || ''))]) }}
                  className="action-btn--warning" title="Pagar">
                  <CreditCard className="sidebar__link-icon" />
                </button>
              )}
              {canPayOrDiscount && (
                <button onClick={() => { setDiscountModal(r); setDiscountPct('') }} className="action-btn--edit" title="Descuento">
                  <Percent className="sidebar__link-icon" />
                </button>
              )}
              <button onClick={() => handleKitchenTicket(r)} className="action-btn--edit" title="Ticket cocina">
                <Printer className="sidebar__link-icon" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="page-title">Pedidos</h1>
          <p className="page-subtitle">Gestiona los pedidos del restaurante</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView('map')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1 ${view === 'map' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <LayoutGrid style={{ width: 16, height: 16 }} /> Mesas
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-sm flex items-center gap-1 ${view === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <List style={{ width: 16, height: 16 }} /> Lista
            </button>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={openCreateModal}
              className="btn-primary"
              disabled={cajaChecked && !currentCashRegister}
              title={cajaChecked && !currentCashRegister ? 'No hay caja abierta' : undefined}
            >
              <Plus className="sidebar__link-icon" /> Nuevo Pedido
            </button>
            {cajaChecked && !currentCashRegister && (
              <span className="text-xs text-red-500">Caja cerrada — abre la caja para registrar pedidos</span>
            )}
          </div>
        </div>
      </div>

      {/* ── MAP VIEW ── */}
      {view === 'map' && (
        <TableMap
          tables={tables}
          activeOrders={activeOrders}
          onTableClick={handleTableClick}
          onPositionsChanged={fetchTables}
        />
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <>
          <div className="filters-bar">
            <select className="input filters-bar__select" value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="open">Abiertas</option>
              <option value="closed">Cerradas</option>
              <option value="paid">Pagadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
            <select className="input filters-bar__select" value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}>
              <option value="">Todos los canales</option>
              {CHANNELS.map((ch) => (
                <option key={ch.value} value={ch.value}>{ch.label}</option>
              ))}
            </select>
          </div>
          <div className="card-flush">
            <DataTable columns={columns} data={orders} loading={loading} emptyMessage="No hay pedidos" />
            <Pagination currentPage={page} lastPage={lastPage} onPageChange={(p) => fetchOrders(p)} />
          </div>
        </>
      )}

      {/* ── CREATE MODAL ── */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Nuevo Pedido" maxWidth="max-w-xl">
        <form onSubmit={handleCreate} className="admin-form">
          <div className="admin-form__grid-2">
            <div>
              <label className="label">Canal *</label>
              <select className="input" value={newChannel} onChange={(e) => setNewChannel(e.target.value)}>
                {CHANNELS.map((ch) => (
                  <option key={ch.value} value={ch.value}>{ch.label}</option>
                ))}
              </select>
            </div>
            {newChannel === 'dine_in' && (
              <div>
                <label className="label">Mesa</label>
                <select
                  className="input"
                  value={newTableId}
                  onChange={(e) => setNewTableId(e.target.value)}
                >
                  <option value="">Sin mesa asignada</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name || `Mesa ${t.number}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="label">Productos *</label>
            <div className="order-items-list">
              {newItems.map((item, idx) => (
                <div key={idx} className="order-item-row">
                  <ProductSearch
                    products={products.filter((p) => p.is_active !== false)}
                    value={item.product_id}
                    onChange={(id) => updateNewItem(idx, 'product_id', id)}
                    fmtMoney={fmtMoney}
                    placeholder="Buscar producto..."
                  />
                  <input type="number" min="1" className="input order-item-row__qty"
                    value={item.quantity} onChange={(e) => updateNewItem(idx, 'quantity', e.target.value)} />
                  {newItems.length > 1 && (
                    <button type="button" onClick={() => removeNewItem(idx)} className="action-btn--delete">
                      <Minus className="sidebar__link-icon" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addNewItem} className="btn-secondary btn-sm mt-2">
              <PlusCircle className="sidebar__link-icon" /> Agregar producto
            </button>
          </div>

          <div className="admin-form__actions">
            <button type="button" className="btn-secondary" onClick={() => setCreateModal(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Creando...' : 'Crear Pedido'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── DETAIL MODAL ── */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={`Pedido #${detailModal?.id || ''}`} maxWidth="max-w-xl">
        {detailModal && (
          <div className="admin-form">
            <div className="admin-form__grid-2">
              <div><span className="label">Estado</span>
                <span className={STATUS_MAP[detailModal.status]?.css || 'badge--muted'}>
                  {STATUS_MAP[detailModal.status]?.label || detailModal.status}
                </span>
              </div>
              <div><span className="label">Canal</span><p className="page-subtitle">{channelLabel(detailModal.channel)}</p></div>
              <div>
                <span className="label">Mesa</span>
                {(detailModal.status === 'open' || detailModal.status === 'closed') && detailModal.channel === 'dine_in' ? (
                  !changeTableOpen ? (
                    <button
                      type="button"
                      onClick={() => { setChangeTableOpen(true); setSelectedNewTable(''); setChangeTableConfirm(false) }}
                      className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 font-medium cursor-pointer bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded transition-colors"
                      title="Cambiar mesa"
                    >
                      <ArrowRightLeft style={{ width: 14, height: 14 }} />
                      {detailModal.table?.name || '—'}
                    </button>
                  ) : !changeTableConfirm ? (
                    <div className="flex items-center gap-2 mt-1">
                      <select
                        className="input"
                        style={{ minWidth: 120 }}
                        value={selectedNewTable}
                        onChange={(e) => setSelectedNewTable(e.target.value)}
                        autoFocus
                      >
                        <option value="">Seleccionar mesa...</option>
                        {tables
                          .filter((t) => t.id !== detailModal.table_id)
                          .map((t) => (
                            <option key={t.id} value={t.id}>{t.name || `Mesa ${t.number}`}</option>
                          ))}
                      </select>
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        disabled={!selectedNewTable}
                        onClick={() => setChangeTableConfirm(true)}
                      >Cambiar</button>
                      <button type="button" className="btn-secondary btn-sm" onClick={() => setChangeTableOpen(false)}>
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800">
                        ¿Mover pedido #{detailModal.id} de <strong>{detailModal.table?.name}</strong> a{' '}
                        <strong>{tables.find(t => String(t.id) === String(selectedNewTable))?.name || 'mesa seleccionada'}</strong>?
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button type="button" className="btn-primary btn-sm" onClick={handleChangeTable} disabled={saving}>
                          {saving ? 'Cambiando...' : 'Confirmar'}
                        </button>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setChangeTableConfirm(false)} disabled={saving}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <p className="page-subtitle">{detailModal.table?.name || '—'}</p>
                )}
              </div>
              <div><span className="label">Mesero</span><p className="page-subtitle">{detailModal.user?.name || '—'}</p></div>
              <div><span className="label">Total</span><p className="dashboard-card__value">{fmtMoney(detailModal.total)}</p></div>
              {detailModal.discount_percentage > 0 && (
                <div><span className="label">Descuento</span><p className="page-subtitle">{detailModal.discount_percentage}%</p></div>
              )}
            </div>
            <div>
              <span className="label">Items</span>
              <div className="order-detail-items">
                {(detailModal.items || []).map((item) => (
                  <div key={item.id} className="order-detail-item">
                    <span>{item.product_name_snapshot || `Producto #${item.product_id}`}</span>
                    <span>×{item.quantity}</span>
                    <span>{fmtMoney(item.subtotal)}</span>
                    {detailModal.status === 'open' && (currentRole !== 'mozo' || detailModal.user_id === user?.id) && (detailModal.items.length > 1) && (
                      <button
                        type="button"
                        className="action-btn--delete ml-1"
                        title="Eliminar ítem"
                        disabled={saving}
                        onClick={() => handleRemoveItem(detailModal.id, item.id)}
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {detailModal.status === 'open' && (currentRole !== 'mozo' || detailModal.user_id === user?.id) && (
                <div className="order-item-row mt-2">
                  <ProductSearch
                    products={products.filter((p) => p.is_active !== false)}
                    value={addItemForm.product_id}
                    onChange={(id) => setAddItemForm((f) => ({ ...f, product_id: id }))}
                    fmtMoney={fmtMoney}
                    placeholder="Buscar producto..."
                  />
                  <input
                    type="number" min="1" className="input order-item-row__qty"
                    value={addItemForm.quantity}
                    onChange={(e) => setAddItemForm((f) => ({ ...f, quantity: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    disabled={saving || !addItemForm.product_id}
                    onClick={() => handleAddItem(detailModal.id)}
                  >
                    <PlusCircle className="sidebar__link-icon" />
                  </button>
                </div>
              )}
            </div>
            <div className="admin-form__actions">
              {detailModal.status === 'open' && (
                <>
                  {(currentRole !== 'mozo' || detailModal.user_id === user?.id) && (
                    <button onClick={() => setCloseConfirm(detailModal)} className="btn-secondary">Confirmar Orden</button>
                  )}
                  <button onClick={() => { setCancelModal(detailModal); setCancelReason('') }} className="btn-danger">Cancelar Orden</button>
                </>
              )}
              {detailModal.status === 'closed' && (
                <>
                  <button onClick={() => handlePrintBill(detailModal)} className="btn-secondary">
                    <Printer className="sidebar__link-icon" /> Imprimir Cuenta
                  </button>
                  {(currentRole !== 'mozo' || detailModal.user_id === user?.id) && (
                    <button onClick={() => handleReopen(detailModal)} className="btn-secondary">Reabrir Orden</button>
                  )}
                  {canPayOrDiscount && (
                    <button onClick={() => { setDiscountModal(detailModal); setDiscountPct(String(detailModal.discount_percentage || '')) }} className="btn-secondary">Descuento</button>
                  )}
                  {canPayOrDiscount && (
                    <button onClick={() => { setPayModal(detailModal); setPayments([newPaymentLine(String(detailModal.total || ''))]); setDetailModal(null) }}
                      className="btn-primary">Pagar</button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── PAY MODAL ── */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Pagar Pedido #${payModal?.id || ''}`} maxWidth="max-w-lg">
        {payModal && (
          <form onSubmit={handlePay} className="admin-form">
            <p className="page-subtitle">Total: <strong>{fmtMoney(payModal.total)}</strong></p>
            {payments.map((p, idx) => (
              <div key={idx} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 120px auto',
                gap: '0.5rem',
                alignItems: 'end',
                marginBottom: '0.75rem',
                padding: '0.75rem',
                background: 'var(--color-bg-muted, #f8f9fa)',
                borderRadius: 8,
              }}>
                <div>
                  {idx === 0 && <label className="label" style={{ marginBottom: 4 }}>Método *</label>}
                  <select className="input" value={p.payment_method_id}
                    onChange={(e) => updatePayment(idx, 'payment_method_id', e.target.value)} required>
                    <option value="">Seleccionar...</option>
                    {paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.id}>{pm.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  {idx === 0 && <label className="label" style={{ marginBottom: 4 }}>Cuenta *</label>}
                  <select className="input" value={p.financial_account_id}
                    onChange={(e) => updatePayment(idx, 'financial_account_id', e.target.value)} required>
                    <option value="">Seleccionar...</option>
                    {financialAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  {idx === 0 && <label className="label" style={{ marginBottom: 4 }}>Monto *</label>}
                  <input type="number" step="0.01" min="0" className="input"
                    value={p.amount} onChange={(e) => updatePayment(idx, 'amount', e.target.value)}
                    placeholder="0.00" required />
                </div>
                <div style={{ paddingBottom: 2 }}>
                  {payments.length > 1 && (
                    <button type="button" onClick={() => removePaymentLine(idx)} className="action-btn--delete">
                      <Minus className="sidebar__link-icon" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={addPaymentLine} className="btn-secondary btn-sm">
              <PlusCircle className="sidebar__link-icon" /> Agregar método
            </button>
            <div className="admin-form__actions">
              <button type="button" className="btn-secondary" onClick={() => setPayModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Procesando...' : 'Registrar Pago'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── CLOSE CONFIRM ── */}
      <ConfirmDialog
        open={!!closeConfirm}
        title="Confirmar Orden"
        message={`¿Estás seguro de confirmar el pedido #${closeConfirm?.id || ''}? Ya no se podrán agregar más items.`}
        confirmText="Sí, confirmar"
        cancelText="Cancelar"
        variant="primary"
        onConfirm={() => { handleCloseOrder(closeConfirm); setCloseConfirm(null) }}
        onClose={() => setCloseConfirm(null)}
      />

      {/* ── CANCEL MODAL ── */}
      <Modal open={!!cancelModal} onClose={() => setCancelModal(null)} title="Cancelar Pedido" maxWidth="max-w-sm">
        <div className="admin-form">
          <div>
            <label className="label">Motivo de cancelación *</label>
            <textarea className="input" rows={3} value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)} placeholder="Escribe el motivo..." autoFocus />
          </div>
          <div className="admin-form__actions">
            <button className="btn-secondary" onClick={() => setCancelModal(null)}>Volver</button>
            <button className="btn-danger" onClick={handleCancel} disabled={saving || !cancelReason.trim()}>
              {saving ? 'Cancelando...' : 'Confirmar Cancelación'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── DISCOUNT MODAL ── */}
      <Modal open={!!discountModal} onClose={() => setDiscountModal(null)} title="Aplicar Descuento" maxWidth="max-w-sm">
        <form onSubmit={handleDiscount} className="admin-form">
          <div>
            <label className="label">Porcentaje de descuento *</label>
            <input type="number" step="0.01" min="0" max="100" className="input" autoFocus
              value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} placeholder="Ej: 10" required />
          </div>
          <div className="admin-form__actions">
            <button type="button" className="btn-secondary" onClick={() => setDiscountModal(null)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Aplicando...' : 'Aplicar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── PAY CONFIRM ── */}
      <ConfirmDialog
        open={payConfirmOpen}
        title="Confirmar Pago"
        message={`¿Registrar el pago de ${fmtMoney(payModal?.total)} para el Pedido #${payModal?.id || ''}?`}
        confirmText="Sí, registrar"
        cancelText="Revisar"
        variant="primary"
        loading={saving}
        onConfirm={handlePayConfirmed}
        onClose={() => setPayConfirmOpen(false)}
      />

      {/* ── RECEIPT MODAL ── */}
      <Modal open={!!receiptModal} onClose={() => setReceiptModal(null)} title="Pago Registrado" maxWidth="max-w-sm">
        {receiptModal && (
          <div className="admin-form">
            <div className="text-center mb-3">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-lg font-semibold text-gray-800">Pago registrado correctamente</p>
            </div>
            <pre className="bg-gray-50 border rounded-lg p-3 text-xs font-mono overflow-auto max-h-72 whitespace-pre-wrap">
              {receiptModal.text}
            </pre>
            <div className="admin-form__actions">
              <button className="btn-secondary" onClick={() => setReceiptModal(null)}>Cerrar</button>
              <button className="btn-primary" onClick={() => {
                const w = window.open('', '_blank', 'width=350,height=600')
                w.document.write(`<pre style="font-family:monospace;font-size:12px;padding:16px">${receiptModal.text}</pre>`)
                w.document.close()
                w.print()
                setReceiptModal(null)
                setDetailModal(null)
              }}>
                <Printer className="sidebar__link-icon" /> Imprimir Recibo
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── COMANDA MODAL (after close) ── */}
      <Modal open={!!commandaModal} onClose={() => setCommandaModal(null)} title="Comanda — ¿Imprimir a cocina?" maxWidth="max-w-sm">
        {commandaModal && (
          <div className="admin-form">
            <pre className="bg-gray-50 border rounded-lg p-3 text-xs font-mono overflow-auto max-h-60 whitespace-pre-wrap">
              {commandaModal.text}
            </pre>
            <div className="admin-form__actions">
              <button className="btn-secondary" onClick={() => setCommandaModal(null)}>No imprimir</button>
              <button className="btn-primary" onClick={() => {
                const w = window.open('', '_blank', 'width=350,height=500')
                w.document.write(`<pre style="font-family:monospace;font-size:12px;padding:16px">${commandaModal.text}</pre>`)
                w.document.close()
                w.print()
                setCommandaModal(null)
                setDetailModal(null)
              }}>
                <Printer className="sidebar__link-icon" /> Imprimir Comanda
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── POST-CREATE: Confirm order and print comanda ── */}
      <ConfirmDialog
        open={!!postCreateOrder}
        title="¿Confirmar Orden?"
        message={`El pedido #${postCreateOrder?.id || ''} fue creado. ¿Deseas confirmar la orden e imprimir la comanda ahora?`}
        confirmText="Sí, confirmar e imprimir"
        cancelText="No, dejar abierta"
        variant="primary"
        onConfirm={async () => {
          const order = postCreateOrder
          setPostCreateOrder(null)
          await handleCloseOrder(order)
        }}
        onClose={() => setPostCreateOrder(null)}
      />
    </div>
  )
}
