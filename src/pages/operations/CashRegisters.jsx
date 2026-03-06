import { useState, useEffect, useCallback } from 'react'
import { cashRegistersApi } from '../../api/cashRegisters'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import Spinner from '../../components/ui/Spinner'
import { DollarSign, Lock, Unlock, FileText, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { isFinancialNotInitializedError } from '../../components/ui/FinancialNotInitializedBanner'

export default function CashRegisters() {
  const [registers, setRegisters] = useState([])
  const [currentRegister, setCurrentRegister] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)

  // Modals
  const [openModal, setOpenModal] = useState(false)
  const [closeModal, setCloseModal] = useState(false)
  const [closeConfirmStep, setCloseConfirmStep] = useState(false)
  const [reportModal, setReportModal] = useState(null)
  const [detailModal, setDetailModal] = useState(null)

  // Forms
  const [openingAmount, setOpeningAmount] = useState('')
  const [openNotes, setOpenNotes] = useState('')
  const [closingAmount, setClosingAmount] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchRegisters = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await cashRegistersApi.list({ page: p })
      setRegisters(res.data.data || [])
      setPage(res.data.current_page || 1)
      setLastPage(res.data.last_page || 1)
    } catch {
      toast.error('Error al cargar cajas')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCurrent = useCallback(async () => {
    try {
      const res = await cashRegistersApi.current()
      setCurrentRegister(res.data.data)
    } catch {
      /* no open register */
    }
  }, [])

  useEffect(() => {
    fetchRegisters()
    fetchCurrent()
  }, [fetchRegisters, fetchCurrent])

  const handleOpen = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await cashRegistersApi.open({
        opening_amount: Number(openingAmount),
        notes: openNotes || undefined,
      })
      toast.success(res.data.message || 'Caja abierta')
      setOpenModal(false)
      setOpeningAmount('')
      setOpenNotes('')
      fetchRegisters()
      fetchCurrent()
    } catch (err) {
      if (isFinancialNotInitializedError(err)) {
        toast.error('Las cuentas financieras no han sido inicializadas. Contacte al administrador.')
      } else {
        toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Error al abrir caja')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleCloseSubmit = (e) => {
    e.preventDefault()
    if (!currentRegister) return
    setCloseConfirmStep(true)
  }

  const handleCloseConfirm = async () => {
    if (!currentRegister) return
    setSaving(true)
    try {
      const res = await cashRegistersApi.close(currentRegister.id, {
        closing_amount_real: Number(closingAmount),
        notes: closeNotes || undefined,
      })
      toast.success(res.data.message || 'Caja cerrada')
      setCloseModal(false)
      setCloseConfirmStep(false)
      setClosingAmount('')
      setCloseNotes('')
      fetchRegisters()
      fetchCurrent()
    } catch (err) {
      if (isFinancialNotInitializedError(err)) {
        toast.error('Las cuentas financieras no han sido inicializadas. Contacte al administrador.')
      } else {
        toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Error al cerrar caja')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleXReport = async () => {
    if (!currentRegister) return
    try {
      const res = await cashRegistersApi.xReport(currentRegister.id)
      setReportModal(res.data.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al generar reporte X')
    }
  }

  const handleShowDetail = async (registerId) => {
    try {
      const res = await cashRegistersApi.show(registerId)
      setDetailModal(res.data.data)
    } catch {
      toast.error('Error al cargar detalle')
    }
  }

  const fmtMoney = (v) => v != null ? `S/ ${Number(v).toFixed(2)}` : '—'
  const fmtDate = (v) => {
    if (!v) return '—'
    const s = String(v).slice(0, 10)            // 'YYYY-MM-DD'
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('es-PE')
  }
  const fmtDateTime = (v) => v ? new Date(v).toLocaleString('es-PE') : '—'

  const columns = [
    { key: 'id', label: 'ID', className: 'w-16' },
    { key: 'date', label: 'Fecha', render: (r) => fmtDate(r.date) },
    {
      key: 'status', label: 'Estado', className: 'w-28',
      render: (r) => (
        <span className={r.status === 'open' ? 'badge--success' : 'badge--muted'}>
          {r.status === 'open' ? 'Abierta' : 'Cerrada'}
        </span>
      ),
    },
    { key: 'opening_amount', label: 'Apertura', render: (r) => fmtMoney(r.opening_amount) },
    { key: 'closing_amount_real', label: 'Cierre', render: (r) => fmtMoney(r.closing_amount_real) },
    { key: 'opener', label: 'Abrió', render: (r) => r.opener?.name || '—' },
    {
      key: 'actions', label: '', className: 'w-16 text-right',
      render: (r) => (
        <button onClick={() => handleShowDetail(r.id)} className="action-btn--edit" title="Ver detalle">
          <Eye className="sidebar__link-icon" />
        </button>
      ),
    },
  ]

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="page-title">Caja Registradora</h1>
          <p className="page-subtitle">Administra la apertura y cierre de caja</p>
        </div>
      </div>

      {/* Status card */}
      <div className="status-card">
        {currentRegister ? (
          <div className="status-card__content">
            <div className="status-card__info">
              <span className="badge--success">Caja Abierta</span>
              <span className="status-card__detail">
                Apertura: {fmtMoney(currentRegister.opening_amount)} — {fmtDateTime(currentRegister.opened_at)} — Por: {currentRegister.opener?.name || '—'}
              </span>
              
            </div>
            <div className="status-card__actions">
              <button onClick={handleXReport} className="btn-secondary btn-sm">
                <FileText className="sidebar__link-icon" /> Reporte Parcial
              </button>
              <button onClick={() => setCloseModal(true)} className="btn-danger btn-sm">
                <Lock className="sidebar__link-icon" /> Cerrar Caja
              </button>
            </div>
          </div>
        ) : (
          <div className="status-card__content">
            <div className="status-card__info">
              <span className="badge--muted">Caja Cerrada</span>
              <span className="status-card__detail">No hay caja abierta actualmente</span>
            </div>
            <button onClick={() => setOpenModal(true)} className="btn-primary btn-sm">
              <Unlock className="sidebar__link-icon" /> Abrir Caja
            </button>
          </div>
        )}
      </div>

      {/* History */}
      <div className="card-flush mt-6">
        <DataTable columns={columns} data={registers} loading={loading} emptyMessage="No hay registros de caja" />
        <Pagination currentPage={page} lastPage={lastPage} onPageChange={(p) => fetchRegisters(p)} />
      </div>

      {/* Open modal */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Abrir Caja" maxWidth="max-w-sm">
        <form onSubmit={handleOpen} className="admin-form">
          <div>
            <label className="label">Monto de apertura *</label>
            <input
              type="number" step="0.01" min="0" className="input" autoFocus
              value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} required
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="label">Notas</label>
            <input className="input" value={openNotes} onChange={(e) => setOpenNotes(e.target.value)}
              placeholder="Opcional" />
          </div>
          <div className="admin-form__actions">
            <button type="button" className="btn-secondary" onClick={() => setOpenModal(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Abriendo...' : 'Abrir Caja'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Close modal */}
      <Modal open={closeModal} onClose={() => { setCloseModal(false); setCloseConfirmStep(false) }} title="Cerrar Caja" maxWidth="max-w-sm">
        {!closeConfirmStep ? (
          <form onSubmit={handleCloseSubmit} className="admin-form">
            <div>
              <label className="label">Monto de cierre *</label>
              <input
                type="number" step="0.01" min="0" className="input" autoFocus
                value={closingAmount} onChange={(e) => setClosingAmount(e.target.value)} required
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="label">Notas</label>
              <input className="input" value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="Opcional" />
            </div>
            <div className="admin-form__actions">
              <button type="button" className="btn-secondary" onClick={() => setCloseModal(false)}>Cancelar</button>
              <button type="submit" className="btn-danger">Cerrar Caja</button>
            </div>
          </form>
        ) : (
          <div className="admin-form">
            <div className="confirm-dialog__body">
              <div className="confirm-dialog__icon-wrapper">
                <Lock className="confirm-dialog__icon" />
              </div>
              <p className="confirm-dialog__message">
                ¿Estás seguro de cerrar la caja con un monto de <strong>{fmtMoney(Number(closingAmount))}</strong>?
              </p>
              <p style={{ fontSize: 13, color: '#6b7280', textAlign: 'center' }}>Esta acción no se puede deshacer.</p>
            </div>
            <div className="confirm-dialog__actions">
              <button className="btn-secondary" onClick={() => setCloseConfirmStep(false)} disabled={saving}>Volver</button>
              <button className="btn-danger" onClick={handleCloseConfirm} disabled={saving}>
                {saving ? 'Cerrando...' : 'Confirmar Cierre'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Partial Report modal */}
      <Modal open={!!reportModal} onClose={() => setReportModal(null)} title="Reporte Parcial" maxWidth="max-w-xl">
        {reportModal && (
          <div className="report-summary">
            <ReportRow label="Fecha" value={fmtDate(reportModal.date)} />
            <ReportRow label="Apertura" value={fmtMoney(reportModal.opening_amount)} />
            <div className="report-summary__divider" />
            <p className="label">Ventas por Método de Pago</p>
            {reportModal.by_payment_method?.length > 0 ? (
              reportModal.by_payment_method.map((pm) => (
                <ReportRow key={pm.payment_method} label={pm.payment_method} value={`${fmtMoney(pm.total)} (${pm.count} vta${pm.count !== 1 ? 's' : ''})`} />
              ))
            ) : (
              <ReportRow label="Sin ventas" value="—" />
            )}
            <div className="report-summary__divider" />
            <ReportRow label="Total ventas" value={fmtMoney(reportModal.total_sales)} bold />
            <ReportRow label="Gastos en efectivo" value={fmtMoney(reportModal.total_expenses_cash)} />
            {reportModal.total_transfers_in > 0 && (
              <ReportRow label="Transferencias (entrada)" value={`+ ${fmtMoney(reportModal.total_transfers_in)}`} />
            )}
            {reportModal.total_transfers_out > 0 && (
              <ReportRow label="Transferencias (salida)" value={`- ${fmtMoney(reportModal.total_transfers_out)}`} />
            )}
            <div className="report-summary__divider" />
            <ReportRow label="Efectivo esperado" value={fmtMoney(reportModal.expected_cash_in_register)} bold />
            <div className="report-summary__divider" />
            <ReportRow label="Pedidos totales" value={reportModal.count_orders_total ?? '—'} />
            <ReportRow label="Pedidos cerrados" value={reportModal.count_orders_closed ?? '—'} />
            <ReportRow label="Pedidos cancelados" value={reportModal.count_orders_cancelled ?? '—'} />
            <ReportRow label="Ventas cobradas" value={reportModal.count_sales ?? '—'} />
          </div>
        )}
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title="Detalle de Caja" maxWidth="max-w-xl">
        {detailModal && (
          <div className="report-summary">
            <ReportRow label="Fecha" value={fmtDate(detailModal.date)} />
            <ReportRow label="Estado" value={detailModal.status === 'open' ? 'Abierta' : 'Cerrada'} />
            <ReportRow label="Monto apertura" value={fmtMoney(detailModal.opening_amount)} />
            <ReportRow label="Monto cierre" value={fmtMoney(detailModal.closing_amount_real)} />
            <ReportRow label="Abrió" value={detailModal.opener?.name || '—'} />
            <ReportRow label="Cerró" value={detailModal.closer?.name || '—'} />
            {detailModal.z_report && (
              <>
                <div className="report-summary__divider" />
                <p className="label">Reporte Z (Final)</p>
                <ReportRow label="Total ventas" value={fmtMoney(detailModal.z_report.total_sales)} bold />
                <ReportRow label="Gastos en efectivo" value={fmtMoney(detailModal.z_report.total_expenses_cash)} />
                {detailModal.z_report.total_transfers_in > 0 && (
                  <ReportRow label="Transferencias (entrada)" value={`+ ${fmtMoney(detailModal.z_report.total_transfers_in)}`} />
                )}
                {detailModal.z_report.total_transfers_out > 0 && (
                  <ReportRow label="Transferencias (salida)" value={`- ${fmtMoney(detailModal.z_report.total_transfers_out)}`} />
                )}
                <ReportRow label="Efectivo esperado" value={fmtMoney(detailModal.z_report.expected_cash_in_register)} bold />
                <ReportRow label="Diferencia" value={fmtMoney(detailModal.z_report.difference)} bold />
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
