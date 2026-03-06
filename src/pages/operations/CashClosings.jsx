import { useState, useEffect, useCallback } from 'react'
import { cashClosingsApi } from '../../api/cashClosings'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import { Eye, Calendar, PlusCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CashClosings() {
  const [closings, setClosings] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)

  const [previewModal, setPreviewModal] = useState(false)
  const [previewDate, setPreviewDate] = useState(new Date().toISOString().slice(0, 10))
  const [previewData, setPreviewData] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const [detailModal, setDetailModal] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchClosings = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await cashClosingsApi.list({ page: p })
      setClosings(res.data.data || [])
      setPage(res.data.current_page || 1)
      setLastPage(res.data.last_page || 1)
    } catch {
      toast.error('Error al cargar cierres')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClosings() }, [fetchClosings])

  const fmtMoney = (v) => v != null ? `S/ ${Number(v).toFixed(2)}` : '—'
  const fmtDate = (v) => {
    if (!v) return '—'
    const s = String(v).slice(0, 10)
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('es-PE')
  }

  const handlePreview = async () => {
    if (!previewDate) return
    setPreviewLoading(true)
    try {
      const res = await cashClosingsApi.preview({ date: previewDate })
      setPreviewData(res.data.data)
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Error al generar preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      const res = await cashClosingsApi.create({ date: previewDate })
      toast.success(res.data.message || 'Cierre contable realizado')
      setPreviewModal(false)
      setPreviewData(null)
      fetchClosings()
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Error al crear cierre')
    } finally {
      setSaving(false)
    }
  }

  const showDetail = async (id) => {
    try {
      const res = await cashClosingsApi.show(id)
      setDetailModal(res.data.data)
    } catch {
      toast.error('Error al cargar detalle')
    }
  }

  const columns = [
    { key: 'id', label: 'ID', className: 'w-16' },
    { key: 'date', label: 'Fecha', render: (r) => fmtDate(r.date) },
    { key: 'total_sales', label: 'Total Ventas', render: (r) => fmtMoney(r.total_sales) },
    { key: 'total_expenses', label: 'Total Gastos', render: (r) => fmtMoney(r.total_expenses) },
    { key: 'net_total', label: 'Ingreso Neto', render: (r) => fmtMoney(r.net_total) },
    { key: 'closed_by', label: 'Cerrado por', render: (r) => r.closed_by?.name || r.closedBy?.name || '—' },
    {
      key: 'actions', label: '', className: 'w-16 text-right',
      render: (r) => (
        <button onClick={() => showDetail(r.id)} className="action-btn--edit" title="Ver detalle">
          <Eye className="sidebar__link-icon" />
        </button>
      ),
    },
  ]

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="page-title">Cierre de Caja</h1>
          <p className="page-subtitle">Cierres contables diarios</p>
        </div>
        <button onClick={() => { setPreviewModal(true); setPreviewData(null) }} className="btn-primary">
          <PlusCircle className="sidebar__link-icon" /> Nuevo Cierre
        </button>
      </div>

      <div className="card-flush">
        <DataTable columns={columns} data={closings} loading={loading} emptyMessage="No hay cierres registrados" />
        <Pagination currentPage={page} lastPage={lastPage} onPageChange={(p) => fetchClosings(p)} />
      </div>

      {/* Preview / Create modal */}
      <Modal open={previewModal} onClose={() => setPreviewModal(false)} title="Cierre Contable" maxWidth="max-w-xl">
        <div className="admin-form">
          <div className="admin-form__grid-2">
            <div>
              <label className="label">Fecha del cierre *</label>
              <input type="date" className="input" value={previewDate}
                onChange={(e) => { setPreviewDate(e.target.value); setPreviewData(null) }} />
            </div>
            <div className="flex items-end">
              <button onClick={handlePreview} className="btn-secondary" disabled={previewLoading}>
                <Calendar className="sidebar__link-icon" /> {previewLoading ? 'Cargando...' : 'Vista previa'}
              </button>
            </div>
          </div>

          {previewData && (
            <div className="report-summary">
              <ReportRow label="Total ventas" value={fmtMoney(previewData.total_sales)} bold />
              <ReportRow label="Total gastos" value={fmtMoney(previewData.total_expenses)} />
              <ReportRow label="Ingreso neto" value={fmtMoney(previewData.net_total)} bold />
              <ReportRow label="Nro. de ventas" value={previewData.sales_count ?? '—'} />
              <ReportRow label="Nro. de gastos" value={previewData.expenses_count ?? '—'} />
              {previewData.sales_by_payment && previewData.sales_by_payment.map((pm) => (
                <ReportRow key={pm.method} label={`Ventas ${pm.method}`} value={fmtMoney(pm.total)} />
              ))}
            </div>
          )}

          {previewData && (
            <div className="admin-form__actions">
              <button className="btn-secondary" onClick={() => setPreviewModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? 'Procesando...' : 'Confirmar Cierre'}
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={`Cierre #${detailModal?.id || ''}`} maxWidth="max-w-xl">
        {detailModal && (
          <div className="report-summary">
            <ReportRow label="Fecha" value={fmtDate(detailModal.date)} />
            <ReportRow label="Total ventas" value={fmtMoney(detailModal.total_sales)} bold />
            <ReportRow label="Total gastos" value={fmtMoney(detailModal.total_expenses)} />
            <ReportRow label="Ingreso neto" value={fmtMoney(detailModal.net_total)} bold />
            <ReportRow label="Cerrado por" value={detailModal.closed_by?.name || detailModal.closedBy?.name || '—'} />
            {detailModal.breakdown && (() => {
              const b = detailModal.breakdown
              const CHANNEL_LABELS = { dine_in: 'Salón', takeaway: 'Para llevar', delivery: 'Delivery' }
              return (
                <>
                  <div className="report-summary__divider" />
                  <p className="label">Desglose</p>
                  {b.sales_count != null && <ReportRow label="Nro. de ventas" value={b.sales_count} />}
                  {b.expenses_count != null && <ReportRow label="Nro. de gastos" value={b.expenses_count} />}
                  {Array.isArray(b.sales_by_channel) && b.sales_by_channel.length > 0 && (
                    <>
                      <p className="label" style={{ marginTop: 8 }}>Ventas por canal</p>
                      {b.sales_by_channel.map((ch) => (
                        <ReportRow key={ch.channel} label={CHANNEL_LABELS[ch.channel] || ch.channel} value={`${ch.count} ventas — ${fmtMoney(ch.total)}`} />
                      ))}
                    </>
                  )}
                  {b.sales_by_channel && typeof b.sales_by_channel === 'object' && !Array.isArray(b.sales_by_channel) && Object.keys(b.sales_by_channel).length > 0 && (
                    <>
                      <p className="label" style={{ marginTop: 8 }}>Ventas por canal</p>
                      {Object.entries(b.sales_by_channel).map(([ch, data]) => (
                        <ReportRow key={ch} label={CHANNEL_LABELS[ch] || ch} value={`${data.count} ventas — ${fmtMoney(data.total)}`} />
                      ))}
                    </>
                  )}
                  {Array.isArray(b.sales_by_payment) && b.sales_by_payment.length > 0 && (
                    <>
                      <p className="label" style={{ marginTop: 8 }}>Ventas por método de pago</p>
                      {b.sales_by_payment.map((pm) => (
                        <ReportRow key={pm.method} label={pm.method} value={fmtMoney(pm.total)} />
                      ))}
                    </>
                  )}
                </>
              )
            })()}
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
