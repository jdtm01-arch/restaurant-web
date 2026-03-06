import { useState, useEffect, useCallback } from 'react'
import { auditLogsApi } from '../../api/auditLogs'
import DataTable from '../../components/ui/DataTable'
import Pagination from '../../components/ui/Pagination'
import toast from 'react-hot-toast'

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)

  // Filters
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p }
      if (filterAction) params.action = filterAction
      if (filterEntity) params.entity_type = filterEntity
      if (filterDateFrom) params.date_from = filterDateFrom
      if (filterDateTo) params.date_to = filterDateTo
      const res = await auditLogsApi.list(params)
      setLogs(res.data.data || [])
      setPage(res.data.current_page || 1)
      setLastPage(res.data.last_page || 1)
    } catch {
      toast.error('Error al cargar logs')
    } finally {
      setLoading(false)
    }
  }, [filterAction, filterEntity, filterDateFrom, filterDateTo])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const fmtDateTime = (v) => v ? new Date(v).toLocaleString('es-PE') : '—'

  const actionBadge = (action) => {
    const map = {
      create: 'badge--success', created: 'badge--success',
      update: 'badge--primary', updated: 'badge--primary',
      delete: 'badge--danger', deleted: 'badge--danger',
    }
    return <span className={map[action] || 'badge--muted'}>{action}</span>
  }

  const columns = [
    { key: 'id', label: 'ID', className: 'w-16' },
    { key: 'created_at', label: 'Fecha', render: (r) => fmtDateTime(r.created_at) },
    { key: 'user', label: 'Usuario', render: (r) => r.user?.name || '—' },
    { key: 'action', label: 'Acción', className: 'w-28', render: (r) => actionBadge(r.action) },
    { key: 'entity_type', label: 'Entidad', render: (r) => r.entity_type || '—' },
    { key: 'entity_id', label: 'ID Entidad', className: 'w-20' },
    {
      key: 'changes', label: 'Cambios', render: (r) => {
        if (!r.old_values && !r.new_values) return '—'
        const changes = r.new_values || r.old_values
        if (typeof changes === 'object') {
          return (
            <span className="text-xs text-gray-500" title={JSON.stringify(changes, null, 2)}>
              {Object.keys(changes).slice(0, 3).join(', ')}
              {Object.keys(changes).length > 3 ? '...' : ''}
            </span>
          )
        }
        return '—'
      },
    },
  ]

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="page-title">Auditoría</h1>
          <p className="page-subtitle">Registro de actividad del sistema</p>
        </div>
      </div>

      <div className="filters-bar">
        <div>
          <label className="label">Acción</label>
          <select className="input filters-bar__select" value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}>
            <option value="">Todas</option>
            <option value="created">Creación</option>
            <option value="updated">Actualización</option>
            <option value="deleted">Eliminación</option>
          </select>
        </div>
        <div>
          <label className="label">Entidad</label>
          <input className="input filters-bar__select" value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)} placeholder="Ej: Order" />
        </div>
        <div>
          <label className="label">Desde</label>
          <input type="date" className="input filters-bar__select" value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Hasta</label>
          <input type="date" className="input filters-bar__select" value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)} />
        </div>
      </div>

      <div className="card-flush">
        <DataTable columns={columns} data={logs} loading={loading} emptyMessage="No hay registros de auditoría" />
        <Pagination currentPage={page} lastPage={lastPage} onPageChange={(p) => fetchLogs(p)} />
      </div>
    </div>
  )
}
