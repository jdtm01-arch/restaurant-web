import { useState, useRef, useCallback, useEffect } from 'react'
import { tablesApi } from '../api/tables'
import { Lock, Unlock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const CELL = 40
const TABLE_W = 96
const TABLE_H = 96

/**
 * Pulsing ring overlay. Uses Web Animations API so no CSS keyframe name needed.
 */
function TransferRing({ pos, type }) {
  const ref = useRef(null)
  const color = type === 'from' ? '#ef4444' : '#10b981'
  const bgColor = type === 'from' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'
  const label = type === 'from' ? '✕ Origen' : '✓ Destino'

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const anim = el.animate(
      [
        { boxShadow: `0 0 0 0 ${color}`, opacity: 1 },
        { boxShadow: `0 0 0 14px transparent`, opacity: 0.6 },
        { boxShadow: `0 0 0 0 ${color}`, opacity: 1 },
      ],
      { duration: 700, iterations: 5, easing: 'ease-in-out' }
    )
    return () => anim.cancel()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: TABLE_W,
        height: TABLE_H,
        zIndex: 200,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        border: `3px solid ${color}`,
        background: bgColor,
        boxSizing: 'border-box',
      }}
    >
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        color,
        background: 'white',
        padding: '2px 6px',
        borderRadius: 6,
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }}>
        {label}
      </span>
    </div>
  )
}

/**
 * Visual floor-map of restaurant tables.
 *
 * Props:
 *  - tables: Table[]            (from API, must include position_x, position_y)
 *  - activeOrders: Order[]      (open/closed orders to show status per table)
 *  - onTableClick(table): void  (when user clicks a table)
 *  - onPositionsChanged(): void (after drag-save so parent can refresh)
 */
export default function TableMap({ tables, activeOrders = [], onTableClick, onPositionsChanged }) {
  const { currentRole } = useAuth()
  const isAdmin = ['admin_general', 'admin_restaurante'].includes(currentRole)
  const [editing, setEditing] = useState(false)
  const [positions, setPositions] = useState({})
  const [dragging, setDragging] = useState(null)
  const [saving, setSaving] = useState(false)
  const containerRef = useRef(null)
  const dragStartRef = useRef(null)

  // Listen for table-transfer DOM events and animate directly on the card elements
  useEffect(() => {
    const handler = (e) => {
      const { from, to } = e.detail
      const pulse = (id, bright, base) => {
        const el = containerRef.current?.querySelector(`[data-table-id="${id}"]`)
        if (!el) return
        el.animate(
          [
            { backgroundColor: base,   opacity: 1    },
            { backgroundColor: bright, opacity: 0.75 },
            { backgroundColor: base,   opacity: 1    },
          ],
          { duration: 500, iterations: 6, easing: 'ease-in-out' }
        )
      }
      pulse(from, '#fca5a5', '#fee2e2')
      pulse(to,   '#6ee7b7', '#d1fae5')
    }
    window.addEventListener('table-transfer', handler)
    return () => window.removeEventListener('table-transfer', handler)
  }, [])

  // Build position map from props
  useEffect(() => {
    const map = {}
    tables.forEach((t, idx) => {
      map[t.id] = {
        x: t.position_x || (idx % 6) * CELL,
        y: t.position_y || Math.floor(idx / 6) * CELL,
      }
    })
    setPositions(map)
  }, [tables])

  // Order lookup by table_id
  const orderByTable = {}
  activeOrders.forEach((o) => {
    if (o.table_id) {
      // Keep the most recent open order for each table
      if (!orderByTable[o.table_id] || o.status === 'open') {
        orderByTable[o.table_id] = o
      }
    }
  })

  const getTableStatus = (tableId) => {
    const order = orderByTable[tableId]
    if (!order) return 'free'
    return order.status // 'open', 'closed', 'paid'
  }

  const STATUS_STYLES = {
    free: 'table-card--free',
    open: 'table-card--occupied',
    closed: 'table-card--closed',
  }

  const STATUS_LABELS = {
    free: 'Libre',
    open: 'Ocupada',
    closed: 'Por cobrar',
  }

  /* ── DRAG HANDLING ── */
  const handlePointerDown = useCallback((e, tableId) => {
    if (!editing) return
    e.preventDefault()
    e.stopPropagation()
    const rect = containerRef.current.getBoundingClientRect()
    dragStartRef.current = {
      tableId,
      startX: e.clientX,
      startY: e.clientY,
      origX: positions[tableId]?.x || 0,
      origY: positions[tableId]?.y || 0,
      rect,
    }
    setDragging(tableId)
  }, [editing, positions])

  const handlePointerMove = useCallback((e) => {
    if (!dragging || !dragStartRef.current) return
    const { tableId, startX, startY, origX, origY } = dragStartRef.current
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    const newX = Math.max(0, origX + dx)
    const newY = Math.max(0, origY + dy)
    setPositions((prev) => ({ ...prev, [tableId]: { x: newX, y: newY } }))
  }, [dragging])

  const handlePointerUp = useCallback(() => {
    if (!dragging || !dragStartRef.current) return
    // Snap to grid
    const { tableId } = dragStartRef.current
    setPositions((prev) => {
      const pos = prev[tableId]
      return {
        ...prev,
        [tableId]: {
          x: Math.round(pos.x / CELL) * CELL,
          y: Math.round(pos.y / CELL) * CELL,
        },
      }
    })
    setDragging(null)
    dragStartRef.current = null
  }, [dragging])

  useEffect(() => {
    if (editing) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      return () => {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
      }
    }
  }, [editing, handlePointerMove, handlePointerUp])

  /* ── SAVE POSITIONS ── */
  const savePositions = async () => {
    setSaving(true)
    try {
      const payload = Object.entries(positions).map(([id, pos]) => ({
        id: Number(id),
        position_x: pos.x,
        position_y: pos.y,
      }))
      await tablesApi.updatePositions(payload)
      toast.success('Mapa de mesas guardado')
      setEditing(false)
      if (onPositionsChanged) onPositionsChanged()
    } catch {
      toast.error('Error al guardar posiciones')
    } finally {
      setSaving(false)
    }
  }

  // Calculate container dimensions from positions
  const maxX = Math.max(...Object.values(positions).map((p) => p.x), 0) + TABLE_W + 20
  const maxY = Math.max(...Object.values(positions).map((p) => p.y), 0) + TABLE_H + 20
  const minW = 6 * CELL + TABLE_W
  const minH = 3 * CELL + TABLE_H

  return (
    <div className="table-map">
      <div className="table-map__toolbar">
        <span className="table-map__legend">
          <span className="table-map__dot table-map__dot--free" /> Libre
          <span className="table-map__dot table-map__dot--occupied" /> Ocupada
          <span className="table-map__dot table-map__dot--closed" /> Por cobrar
        </span>
        <div className="table-map__actions">
          {isAdmin && (editing ? (
            <>
              <button className="btn-secondary btn-sm" onClick={() => { setEditing(false); onPositionsChanged?.() }} disabled={saving}>
                Cancelar
              </button>
              <button className="btn-primary btn-sm" onClick={savePositions} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar mapa'}
              </button>
            </>
          ) : (
            <button className="btn-secondary btn-sm" onClick={() => setEditing(true)} title="Organizar mesas">
              <Unlock className="sidebar__link-icon" /> Organizar mesas
            </button>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className={`table-map__canvas${editing ? ' table-map__canvas--editing' : ''}`}
        style={{ minWidth: Math.max(minW, maxX), minHeight: Math.max(minH, maxY) }}
      >
        {tables.filter((t) => t.is_active !== false).map((t) => {
          const pos = positions[t.id] || { x: 0, y: 0 }
          const status = getTableStatus(t.id)
          const isDragging = dragging === t.id

          return (
            <div
              key={t.id}
              data-table-id={t.id}
              className={`table-card ${STATUS_STYLES[status] || 'table-card--free'}${isDragging ? ' table-card--dragging' : ''}${editing ? ' table-card--editable' : ''}`}
              style={{
                left: pos.x,
                top: pos.y,
                width: TABLE_W,
                height: TABLE_H,
                position: 'absolute',
                cursor: editing ? 'grab' : 'pointer',
                zIndex: isDragging ? 100 : 1,
              }}
              onPointerDown={(e) => editing ? handlePointerDown(e, t.id) : null}
              onClick={() => !editing && onTableClick?.(t)}
            >
              <span className="table-card__name">{t.name || `Mesa ${t.number}`}</span>
              {!editing && (
                <span className={`table-card__status ${status}`}>
                  {STATUS_LABELS[status]}
                </span>
              )}
              {!editing && orderByTable[t.id]?.user?.name && (
                <span className="table-card__waiter">{orderByTable[t.id].user.name}</span>
              )}
              {editing && (
                <span className="table-card__status">
                  <Lock className="sidebar__link-icon" style={{ width: 12, height: 12 }} />
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
