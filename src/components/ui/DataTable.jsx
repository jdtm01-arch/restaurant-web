import { ChevronUp, ChevronDown } from 'lucide-react'
import Spinner from './Spinner'

export default function DataTable({
  columns,
  data,
  loading = false,
  emptyMessage = 'No hay datos para mostrar',
  sortField,
  sortDirection,
  onSort,
}) {
  const handleSort = (field) => {
    if (!onSort) return
    if (sortField === field) {
      onSort(field, sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(field, 'asc')
    }
  }

  if (loading) {
    return (
      <div className="data-table__loading">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return <div className="data-table__empty">{emptyMessage}</div>
  }

  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead className="data-table__head">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`data-table__th ${col.sortable ? 'data-table__th--sortable' : ''} ${col.className || ''}`}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <div className="data-table__th-inner">
                  {col.label}
                  {col.sortable && sortField === col.key && (
                    sortDirection === 'asc'
                      ? <ChevronUp className="data-table__sort-icon" />
                      : <ChevronDown className="data-table__sort-icon" />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="data-table__body">
          {data.map((row, i) => (
            <tr key={row.id || i} className="data-table__row">
              {columns.map((col) => (
                <td key={col.key} className={`data-table__td ${col.className || ''}`}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
