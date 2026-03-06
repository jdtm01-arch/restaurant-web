import { useState, useEffect, useCallback } from 'react'
import { salesApi } from '../../api/sales'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import { Eye, Printer } from 'lucide-react'
import toast from 'react-hot-toast'

const CHANNEL_LABELS = {
  dine_in: 'Salón',
  takeaway: 'Para llevar',
  delivery: 'Delivery',
}

const fmtChannel = (v) => CHANNEL_LABELS[v] || v || '—'

export default function Sales() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [detailModal, setDetailModal] = useState(null)
  const [summary, setSummary] = useState(null)

  const fetchSales = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p }
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const [listRes, sumRes] = await Promise.all([
        salesApi.list(params),
        salesApi.summary(dateFrom || dateTo ? { date_from: dateFrom || undefined, date_to: dateTo || undefined } : {}),
      ])
      setSales(listRes.data.data || [])
      setPage(listRes.data.current_page || 1)
      setLastPage(listRes.data.last_page || 1)
      setSummary(sumRes.data.data || null)
    } catch {
      toast.error('Error al cargar ventas')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => { fetchSales() }, [fetchSales])

  const fmtMoney = (v) => v != null ? `S/ ${Number(v).toFixed(2)}` : '—'
  const fmtDateTime = (v) => v ? new Date(v).toLocaleString('es-PE') : '—'

  const showDetail = async (id) => {
    try {
      const res = await salesApi.show(id)
      setDetailModal(res.data.data)
    } catch {
      toast.error('Error al cargar detalle')
    }
  }

  const printReceipt = async (id) => {
    try {
      const res = await salesApi.receipt(id)
      const text = res.data.data?.text || 'Sin contenido'
      const w = window.open('', '_blank', 'width=350,height=600')
      w.document.write(`<pre style="font-family:monospace;font-size:12px;">${text}</pre>`)
      w.document.close()
      w.print()
    } catch {
      toast.error('Error al generar recibo')
    }
  }

  const columns = [
    { key: 'id', label: 'ID', className: 'w-16' },
    { key: 'paid_at', label: 'Fecha', render: (r) => fmtDateTime(r.paid_at) },
    { key: 'channel', label: 'Canal', render: (r) => fmtChannel(r.channel || r.order?.channel) },
    { key: 'total', label: 'Total', render: (r) => fmtMoney(r.total) },
    { key: 'user', label: 'Cobrado por', render: (r) => r.user?.name || '—' },
    {
      key: 'payments', label: 'Métodos', render: (r) =>
        (r.payments || []).map((p) => p.payment_method?.name || '?').join(', ') || '—',
    },
    {
      key: 'actions', label: '', className: 'w-24 text-right',
      render: (r) => (
        <div className="action-cell">
          <button onClick={() => showDetail(r.id)} className="action-btn--edit" title="Ver detalle">
            <Eye className="sidebar__link-icon" />
          </button>
          <button onClick={() => printReceipt(r.id)} className="action-btn--warning" title="Imprimir recibo">
            <Printer className="sidebar__link-icon" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="page-title">Ventas</h1>
          <p className="page-subtitle">Historial de ventas del restaurante</p>
        </div>
      </div>

      <div className="filters-bar">
        <div>
          <label className="label">Desde</label>
          <input type="date" className="input filters-bar__select" value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Hasta</label>
          <input type="date" className="input filters-bar__select" value={dateTo}
            onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {/* Summary totals by payment method */}
      {summary && (
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2">
            <span className="text-xs font-medium text-gray-500 uppercase">Total</span>
            <span className="text-sm font-bold text-gray-900">{fmtMoney(summary.total_general)}</span>
          </div>
          {(summary.by_method || []).map((m) => (
            <div key={m.method_name} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2">
              <span className="text-xs font-medium text-gray-500">{m.method_name}</span>
              <span className="text-sm font-bold text-gray-900">{fmtMoney(m.total)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card-flush">
        <DataTable columns={columns} data={sales} loading={loading} emptyMessage="No hay ventas registradas" />
        <Pagination currentPage={page} lastPage={lastPage} onPageChange={(p) => fetchSales(p)} />
      </div>

      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={`Venta #${detailModal?.id || ''}`} maxWidth="max-w-xl">
        {detailModal && (
          <div className="report-summary">
            <ReportRow label="Fecha" value={fmtDateTime(detailModal.paid_at)} />
            <ReportRow label="Total" value={fmtMoney(detailModal.total)} bold />
            <ReportRow label="Canal" value={fmtChannel(detailModal.channel || detailModal.order?.channel)} />
            <ReportRow label="Mesa" value={detailModal.order?.table?.name || '—'} />
            <ReportRow label="Cobrado por" value={detailModal.user?.name || '—'} />

            {detailModal.payments?.length > 0 && (
              <>
                <div className="report-summary__divider" />
                <p className="label">Pagos</p>
                {detailModal.payments.map((p, i) => (
                  <ReportRow key={i} label={p.payment_method?.name || '?'} value={fmtMoney(p.amount)} />
                ))}
              </>
            )}

            {detailModal.order?.items?.length > 0 && (
              <>
                <div className="report-summary__divider" />
                <p className="label">Items</p>
                {detailModal.order.items.map((item) => (
                  <ReportRow key={item.id}
                    label={`${item.product_name_snapshot || item.product_name || 'Producto'} ×${item.quantity}`}
                    value={fmtMoney(item.subtotal)} />
                ))}
              </>
            )}

            {Number(detailModal.discount_amount) > 0 && (
              <>
                <div className="report-summary__divider" />
                <ReportRow label="Subtotal" value={fmtMoney(detailModal.subtotal)} />
                <ReportRow
                  label={`Descuento${detailModal.order?.discount_percentage > 0 ? ` (${detailModal.order.discount_percentage}%)` : ''}`}
                  value={`− ${fmtMoney(detailModal.discount_amount)}`}
                />
                <ReportRow label="Total con descuento" value={fmtMoney(detailModal.total)} bold />
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function ReportRow({ label, value, bold }) {
  return (
    <div className={`report-row${bold ? ' report-row--bold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
