import { useState, useCallback, useRef } from 'react'
import { reportsApi } from '../../api/reports'
import { useAuth } from '../../context/AuthContext'
import DataTable from '../../components/ui/DataTable'
import Spinner from '../../components/ui/Spinner'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, Cell, LabelList,
} from 'recharts'
import { BarChart3, Clock, Users, CreditCard, DollarSign, Star, FileText, TrendingUp, Download } from 'lucide-react'
import toast from 'react-hot-toast'

const today = new Date().toISOString().slice(0, 10)

const REPORT_TYPES = [
  { key: 'dailySummary', label: 'Resumen Diario', icon: FileText, dateType: 'single' },
  { key: 'salesByCategory', label: 'Ventas por Categoría', icon: BarChart3, dateType: 'range' },
  { key: 'salesByHour', label: 'Ventas por Hora', icon: Clock, dateType: 'range' },
  { key: 'salesByWaiter', label: 'Ventas por Mesero', icon: Users, dateType: 'range' },
  { key: 'topProducts', label: 'Productos Top', icon: Star, dateType: 'range' },
  { key: 'dailyCashFlow', label: 'Flujo de Caja', icon: DollarSign, dateType: 'range' },
  { key: 'cancellationsDiscounts', label: 'Cancelaciones y Descuentos', icon: TrendingUp, dateType: 'range' },
  { key: 'accountsPayable', label: 'Cuentas por Pagar', icon: CreditCard, dateType: 'none' },
]

/* ── Helpers ── */
const fmtMoney = (v) => v != null ? `S/ ${Number(v).toFixed(2)}` : '—'
const fmtPct = (v) => v != null ? `${Number(v).toFixed(2)}%` : '—'
const STATUS_LABELS = { pending: 'Pendiente', partial: 'Parcial', paid: 'Pagado', cancelled: 'Cancelado' }
const fmtStatus = (v) => STATUS_LABELS[v] || v || '—'
const fmtDate = (v) => {
  if (!v) return '—'
  const s = String(v).slice(0, 10)
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}
const fmtHour = (v) => {
  if (v === null || v === undefined) return '—'
  const h = Number(v)
  return `${String(h).padStart(2, '0')}:00`
}

export default function Reports() {
  const { user } = useAuth()
  const [activeReport, setActiveReport] = useState('dailySummary')
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [singleDate, setSingleDate] = useState(today)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const cashFlowRef       = useRef(null)
  const consolidatedChartRef = useRef(null)
  const evolutionChartRef    = useRef(null)
  const [exportingPdf, setExportingPdf] = useState(false)

  const reportConfig = REPORT_TYPES.find((r) => r.key === activeReport)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setData(null)
    try {
      let params = {}
      if (reportConfig.dateType === 'range') {
        params = { date_from: dateFrom, date_to: dateTo }
      } else if (reportConfig.dateType === 'single') {
        params = { date: singleDate }
      }
      const res = await reportsApi[activeReport](params)
      setData(res.data.data)
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error?.message || 'Error al generar reporte')
    } finally {
      setLoading(false)
    }
  }, [activeReport, dateFrom, dateTo, singleDate, reportConfig])

  /* ── RENDER: Daily Summary ── */
  const renderDailySummary = () => {
    if (!data || typeof data !== 'object') return null

    const rows = [
      { label: 'Fecha', value: fmtDate(data.date) },
      { label: 'Total Ventas', value: fmtMoney(data.total_sales) },
      { label: 'Total Pedidos', value: data.total_orders ?? '—' },
      { label: 'Ticket Promedio', value: fmtMoney(data.average_ticket) },
      { label: 'Total Gastos', value: fmtMoney(data.total_expenses) },
      { label: 'Ingreso Neto', value: fmtMoney(data.net_income) },
      { label: '% Salón', value: data.dine_in_pct != null ? `${Number(data.dine_in_pct).toFixed(2)}%` : '—' },
      { label: '% Para Llevar', value: data.takeaway_pct != null ? `${Number(data.takeaway_pct).toFixed(2)}%` : '—' },
      { label: '% Delivery', value: data.delivery_pct != null ? `${Number(data.delivery_pct).toFixed(2)}%` : '—' },
      { label: 'Pedidos Cancelados', value: data.cancelled_orders ?? '—' },
      { label: 'Diferencia de Caja', value: fmtMoney(data.cash_register_difference) },
    ]

    return (
      <div className="report-summary">
        {rows.map((r) => (
          <div key={r.label} className="report-row">
            <span>{r.label}</span>
            <span>{r.value}</span>
          </div>
        ))}
      </div>
    )
  }

  /* ── RENDER: Sales by Category ── */
  const renderSalesByCategory = () => {
    if (!data || typeof data !== 'object') return null

    const totals = data.totals || {}
    const byCategory = data.by_category || []

    const cols = [
      { key: 'category_id', label: 'ID Categoría' },
      { key: 'category_name', label: 'Categoría' },
      { key: 'total', label: 'Total', render: (r) => fmtMoney(r.total) },
      { key: 'quantity_sold', label: 'Cantidad Vendida' },
      { key: 'dine_in', label: 'Salón', render: (r) => fmtMoney(r.dine_in) },
      { key: 'takeaway', label: 'Para Llevar', render: (r) => fmtMoney(r.takeaway) },
      { key: 'delivery', label: 'Delivery', render: (r) => r.delivery != null ? fmtMoney(r.delivery) : '—' },
      { key: 'percentage_of_total', label: '% del Total', render: (r) => fmtPct(r.percentage_of_total) },
    ]

    return (
      <div>
        <div className="report-summary mb-4">
          <div className="report-row" style={{ justifyContent: 'flex-end', gap: 24 }}>
            <span>Total Ventas: <strong>{fmtMoney(totals.total_sales)}</strong></span>
            <span>Total Salón: <strong>{fmtMoney(totals.total_dine_in)}</strong></span>
            <span>Total Para Llevar: <strong>{fmtMoney(totals.total_takeaway)}</strong></span>
            <span>Total Delivery: <strong>{fmtMoney(totals.total_delivery)}</strong></span>
          </div>
        </div>
        {byCategory.length > 0 ? (
          <DataTable columns={cols} data={byCategory} />
        ) : (
          <p className="data-table__empty">Sin datos para el período seleccionado</p>
        )}
      </div>
    )
  }

  /* ── RENDER: Sales by Hour ── */
  const renderSalesByHour = () => {
    if (!data || typeof data !== 'object') return null

    const byHour = data.by_hour || []

    const cols = [
      { key: 'hour', label: 'Hora', render: (r) => fmtHour(r.hour) },
      { key: 'total_sales', label: 'Total Ventas', render: (r) => fmtMoney(r.total_sales) },
      { key: 'count_orders', label: 'Nro. Pedidos' },
    ]

    return (
      <div>
        <div className="report-summary mb-4">
          <div className="report-row">
            <span>Hora Pico: <strong>{fmtHour(data.peak_hour)}</strong></span>
            <span>Promedio por Hora: <strong>{fmtMoney(data.average_per_hour)}</strong></span>
          </div>
        </div>
        {byHour.length > 0 ? (
          <DataTable columns={cols} data={byHour} />
        ) : (
          <p className="data-table__empty">Sin datos para el período seleccionado</p>
        )}
      </div>
    )
  }

  /* ── RENDER: Sales by Waiter ── */
  const renderSalesByWaiter = () => {
    if (!data || typeof data !== 'object') return null

    const byWaiter = data.by_waiter || []

    const cols = [
      { key: 'user_id', label: 'ID' },
      { key: 'user_name', label: 'Mesero' },
      { key: 'total_sales', label: 'Total Ventas', render: (r) => fmtMoney(r.total_sales) },
      { key: 'count_orders', label: 'Nro. Pedidos' },
      { key: 'count_cancelled', label: 'Cancelados' },
      { key: 'average_ticket', label: 'Ticket Promedio', render: (r) => fmtMoney(r.average_ticket) },
    ]

    return byWaiter.length > 0 ? (
      <DataTable columns={cols} data={byWaiter} />
    ) : (
      <p className="data-table__empty">Sin datos para el período seleccionado</p>
    )
  }

  /* ── RENDER: Top Products ── */
  const renderTopProducts = () => {
    if (!data || typeof data !== 'object') return null

    const topSellers = data.top_sellers || []
    const leastSellers = data.least_sellers || []

    const cols = [
      { key: 'product_name', label: 'Producto' },
      { key: 'quantity_sold', label: 'Cantidad Vendida' },
      { key: 'revenue', label: 'Ingresos', render: (r) => fmtMoney(r.revenue) },
    ]

    return (
      <div>
        <p className="label mt-2 mb-1">Más Vendidos</p>
        {topSellers.length > 0 ? (
          <DataTable columns={cols} data={topSellers} />
        ) : (
          <p className="data-table__empty">Sin datos</p>
        )}
        <p className="label mt-4 mb-1">Menos Vendidos</p>
        {leastSellers.length > 0 ? (
          <DataTable columns={cols} data={leastSellers} />
        ) : (
          <p className="data-table__empty">Sin datos</p>
        )}
      </div>
    )
  }

  /* ── RENDER: Daily Cash Flow ── */
  const handleExportCashFlowPdf = async () => {
    if (!data?.by_day?.length) return
    setExportingPdf(true)
    try {
      const [{ default: jsPDF }] = await Promise.all([
        import('jspdf'),
      ])

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const W = pdf.internal.pageSize.getWidth()
      const H = pdf.internal.pageSize.getHeight()
      const margin = 15
      let y = margin

      // Restaurant info
      const restaurantId = localStorage.getItem('restaurant_id')
      const restaurant = user?.restaurants?.find(r => String(r.id) === String(restaurantId)) || user?.restaurants?.[0]
      const restaurantName = restaurant?.name || 'Restaurante'

      // Try to load logo
      try {
        const logoImg = new Image()
        logoImg.crossOrigin = 'anonymous'
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve
          logoImg.onerror = reject
          logoImg.src = '/logo.png'
        })
        const logoH = 15
        const logoW = (logoImg.width / logoImg.height) * logoH
        pdf.addImage(logoImg, 'PNG', margin, y, logoW, logoH)
        // Restaurant name next to logo
        pdf.setFontSize(16)
        pdf.setFont(undefined, 'bold')
        pdf.text(restaurantName, margin + logoW + 5, y + 10)
        y += logoH + 4
      } catch {
        // No logo — just text
        pdf.setFontSize(16)
        pdf.setFont(undefined, 'bold')
        pdf.text(restaurantName, margin, y + 6)
        y += 12
      }

      // Report title
      pdf.setFontSize(13)
      pdf.setFont(undefined, 'bold')
      pdf.text('Reporte de Flujo de Caja', margin, y + 6)
      y += 8

      // Date range
      pdf.setFontSize(9)
      pdf.setFont(undefined, 'normal')
      pdf.setTextColor(100, 100, 100)
      pdf.text(`Período: ${fmtDate(dateFrom)} — ${fmtDate(dateTo)}   |   Generado: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`, margin, y + 4)
      pdf.setTextColor(0, 0, 0)
      y += 10

      // Separator line
      pdf.setDrawColor(220, 220, 220)
      pdf.setLineWidth(0.5)
      pdf.line(margin, y, W - margin, y)
      y += 6

      // Render charts to canvas
      const { default: html2canvas } = await import('html2canvas')

      const captureChart = async (ref) => {
        const el = ref?.current?.querySelector('.recharts-wrapper')
        if (!el) return null
        try {
          const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
          return { imgData: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height }
        } catch { return null }
      }

      const [img1, img2] = await Promise.all([
        captureChart(consolidatedChartRef),
        captureChart(evolutionChartRef),
      ])

      // Página 1: header + gráfico consolidado
      const addChartInline = (result, title, startY, summaryItems = null) => {
        let py = startY
        pdf.setFontSize(10)
        pdf.setFont(undefined, 'bold')
        pdf.setTextColor(45, 55, 72)
        pdf.text(title, margin, py + 5)
        py += 8
        pdf.setDrawColor(220, 220, 220)
        pdf.setLineWidth(0.3)
        pdf.line(margin, py, W - margin, py)
        py += 3

        // Summary row above chart if provided
        if (summaryItems?.length) {
          const itemW = (W - margin * 2) / summaryItems.length
          summaryItems.forEach(({ name, valor, rgb }, i) => {
            const ix = margin + i * itemW
            pdf.setFillColor(rgb[0], rgb[1], rgb[2])
            pdf.roundedRect(ix, py, itemW - 3, 10, 2, 2, 'F')
            pdf.setTextColor(255, 255, 255)
            pdf.setFontSize(7.5)
            pdf.setFont(undefined, 'bold')
            pdf.text(name, ix + (itemW - 3) / 2, py + 4, { align: 'center' })
            pdf.setFontSize(8.5)
            pdf.text(fmtMoney(valor), ix + (itemW - 3) / 2, py + 8.5, { align: 'center' })
          })
          pdf.setTextColor(0, 0, 0)
          py += 14
        }

        if (result?.imgData) {
          const chartW = W - margin * 2
          const maxH = H - py - margin - 5
          const naturalH = (result.h / result.w) * chartW
          const chartH = Math.min(Math.max(naturalH, maxH * 0.75), maxH)
          pdf.addImage(result.imgData, 'PNG', margin, py, chartW, chartH)
          py += chartH
        }
        pdf.setTextColor(0, 0, 0)
        return py
      }

      const consolidatedSummary = [
        { name: 'Ventas Efectivo', valor: data.totals?.total_cash_sales ?? 0,                                                                                             rgb: [147, 197, 253] },
        { name: 'Otras Ventas',    valor: data.totals?.total_other_sales ?? 0,                                                                                            rgb: [29,  78,  216] },
        { name: 'Gastos Efectivo', valor: data.totals?.total_expenses ?? 0,                                                                                               rgb: [252, 165, 165] },
        { name: 'Otros Gastos',    valor: (data.totals?.total_all_expenses ?? 0) - (data.totals?.total_expenses ?? 0),                                                    rgb: [220,  38,  38] },
        { name: 'Flujo Neto',      valor: (data.totals?.total_cash_sales ?? 0) + (data.totals?.total_other_sales ?? 0) - (data.totals?.total_all_expenses ?? 0),         rgb: [16,  185, 129] },
      ]

      addChartInline(img1, 'Consolidado del Período', y, consolidatedSummary)

      // Página 2: gráfico evolución diaria
      pdf.addPage()
      y = margin
      addChartInline(img2, 'Evolución Diaria: Ventas vs Gastos', y)

      // Página 3+: tabla
      pdf.addPage()
      y = margin
      const byDay = data.by_day
      const headers = ['Fecha', 'Apertura', 'V. Efectivo', 'Otras V.', 'Total V.', 'G. Efectivo', 'Otros G.', 'Total G.', 'Tr. Entrada', 'Tr. Salida', 'Efec. Esperado', 'Efec. Real', 'Diferencia', 'Flujo Neto']
      const colW = (W - margin * 2) / headers.length

      // Header row
      pdf.setFillColor(45, 55, 72)
      pdf.rect(margin, y, W - margin * 2, 8, 'F')
      pdf.setFontSize(7)
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(255, 255, 255)
      headers.forEach((h, i) => {
        pdf.text(h, margin + i * colW + colW / 2, y + 5.5, { align: 'center' })
      })
      pdf.setTextColor(0, 0, 0)
      y += 8

      // Data rows
      pdf.setFont(undefined, 'normal')
      pdf.setFontSize(7)
      byDay.forEach((row, idx) => {
        if (y > H - 25) {
          pdf.addPage()
          y = margin
        }
        if (idx % 2 === 0) {
          pdf.setFillColor(248, 250, 252)
          pdf.rect(margin, y, W - margin * 2, 7, 'F')
        }
        const vals = [
          fmtDate(row.date),
          fmtMoney(row.opening_amount),
          fmtMoney(row.cash_sales),
          fmtMoney(row.other_sales),
          fmtMoney(row.total_sales),
          fmtMoney(row.cash_expenses),
          fmtMoney(row.other_expenses),
          fmtMoney(row.total_expenses),
          row.transfers_in  ? fmtMoney(row.transfers_in)  : '—',
          row.transfers_out ? fmtMoney(row.transfers_out) : '—',
          fmtMoney(row.expected_cash),
          fmtMoney(row.actual_cash),
          fmtMoney(row.difference),
          fmtMoney(row.net_flow),
        ]
        vals.forEach((v, i) => {
          pdf.text(v, margin + i * colW + colW / 2, y + 5, { align: 'center' })
        })
        y += 7
      })

      y += 4

      // Totals section
      if (y > H - 40) { pdf.addPage(); y = margin }
      pdf.setDrawColor(220, 220, 220)
      pdf.line(margin, y, W - margin, y)
      y += 6

      const totals = data.totals || {}
      const totalVentas = (totals.total_cash_sales ?? 0) + (totals.total_other_sales ?? 0)
      const totalGastos = totals.total_all_expenses ?? 0
      const resultado   = totalVentas - totalGastos

      // Registro Contable header
      pdf.setFont(undefined, 'bold')
      pdf.setFontSize(10)
      pdf.text('Registro Contable', margin, y + 5)
      y += 8

      const summaryRows = [
        ['Total Ventas', fmtMoney(totalVentas)],
        ['Total Gastos', fmtMoney(totalGastos)],
        ['Resultado Contable', fmtMoney(resultado)],
      ]
      pdf.setFontSize(9)
      summaryRows.forEach(([label, val]) => {
        pdf.setFont(undefined, 'bold')
        pdf.text(label, margin, y + 4)
        pdf.text(val, W - margin, y + 4, { align: 'right' })
        y += 6
      })

      // Footer
      const pageCount = pdf.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)
        pdf.setFontSize(7)
        pdf.setFont(undefined, 'normal')
        pdf.setTextColor(150, 150, 150)
        pdf.text(`${restaurantName} — Flujo de Caja`, margin, H - 7)
        pdf.text(`Página ${i} de ${pageCount}`, W - margin, H - 7, { align: 'right' })
      }

      pdf.save(`flujo_caja_${dateFrom}_${dateTo}.pdf`)
      toast.success('PDF exportado')
    } catch (err) {
      console.error(err)
      toast.error('Error al exportar PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  const renderDailyCashFlow = () => {
    if (!data || typeof data !== 'object') return null

    const byDay = data.by_day || []
    const totals = data.totals || {}

    const cols = [
      { key: 'date', label: 'Fecha', render: (r) => fmtDate(r.date) },
      { key: 'opening_amount', label: 'Apertura', render: (r) => fmtMoney(r.opening_amount) },
      { key: 'cash_sales', label: 'Ventas Efectivo', render: (r) => fmtMoney(r.cash_sales) },
      { key: 'other_sales', label: 'Otras Ventas', render: (r) => fmtMoney(r.other_sales) },
      { key: 'total_sales', label: 'Total Ventas', render: (r) => fmtMoney(r.total_sales) },
      { key: 'cash_expenses', label: 'Gastos Efectivo', render: (r) => fmtMoney(r.cash_expenses) },
      { key: 'other_expenses', label: 'Otros Gastos', render: (r) => fmtMoney(r.other_expenses) },
      { key: 'total_expenses', label: 'Total Gastos', render: (r) => fmtMoney(r.total_expenses) },
      { key: 'transfers_in',  label: 'Transf. Entrada', render: (r) => r.transfers_in  ? fmtMoney(r.transfers_in)  : '—' },
      { key: 'transfers_out', label: 'Transf. Salida',  render: (r) => r.transfers_out ? fmtMoney(r.transfers_out) : '—' },
      { key: 'expected_cash', label: 'Efectivo Esperado', render: (r) => fmtMoney(r.expected_cash) },
      { key: 'actual_cash', label: 'Efectivo Real', render: (r) => fmtMoney(r.actual_cash) },
      { key: 'difference', label: 'Diferencia', render: (r) => fmtMoney(r.difference) },
      { key: 'net_flow', label: 'Flujo Neto', render: (r) => fmtMoney(r.net_flow) },
    ]

    // Gráfico 1 — Consolidado del período (una barra por concepto)
    const consolidatedItems = [
      { name: 'Ventas Efectivo', valor: totals.total_cash_sales ?? 0,                                                                       color: '#93c5fd' },
      { name: 'Otras Ventas',    valor: totals.total_other_sales ?? 0,                                                                      color: '#1d4ed8' },
      { name: 'Gastos Efectivo', valor: totals.total_expenses ?? 0,                                                                        color: '#fca5a5' },
      { name: 'Otros Gastos',    valor: (totals.total_all_expenses ?? 0) - (totals.total_expenses ?? 0),                                    color: '#dc2626' },
      { name: 'Flujo Neto',      valor: (totals.total_cash_sales ?? 0) + (totals.total_other_sales ?? 0) - (totals.total_all_expenses ?? 0), color: '#10b981' },
    ]

    // Gráfico 2 — Evolución diaria de total ventas y total gastos
    const evolutionData = byDay.map((d) => ({
      date: fmtDate(d.date),
      'Total Ventas':  d.total_sales,
      'Total Gastos':  d.total_expenses,
    }))

    const SimpleTooltip = ({ active, payload, label }) => {
      if (!active || !payload?.length) return null
      return (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
          {payload.map((p) => (
            <p key={p.dataKey} style={{ color: p.color, margin: '2px 0' }}>{p.name}: {fmtMoney(p.value)}</p>
          ))}
        </div>
      )
    }

    const ConsolidatedLabel = ({ x, y, width, value, index }) => {
      const item = consolidatedItems[index]
      if (!item || value == null) return null
      const text = fmtMoney(value)
      const padX = 5, padY = 3
      const fontSize = 10
      const charW = fontSize * 0.55
      const rectW = text.length * charW + padX * 2
      const rectH = fontSize + padY * 2
      const cx = x + width / 2
      const cy = y - rectH - 4
      return (
        <g>
          <rect x={cx - rectW / 2} y={cy} width={rectW} height={rectH} rx={3} ry={3} fill={item.color} opacity={0.92} />
          <text x={cx} y={cy + rectH - padY} textAnchor="middle" fill="#fff" fontSize={fontSize} fontWeight="700">{text}</text>
        </g>
      )
    }

    return (
      <div ref={cashFlowRef}>
        {byDay.length > 0 && (
          <div style={{ marginBottom: 24 }}>

            {/* Gráfico 1 — Consolidado */}
            <div ref={consolidatedChartRef} style={{ marginBottom: 24 }}>
              <p className="label mb-2">Consolidado del Período</p>
              <div style={{ width: '100%', height: 380 }}>
                <ResponsiveContainer>
                  <BarChart data={consolidatedItems} margin={{ top: 50, right: 20, left: 10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `S/${v}`} />
                    <Tooltip content={<SimpleTooltip />} />
                    <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                      {consolidatedItems.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                      <LabelList dataKey="valor" position="top" content={<ConsolidatedLabel />} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2 — Evolución diaria */}
            <div ref={evolutionChartRef}>
              <p className="label mb-2">Evolución Diaria: Ventas vs Gastos</p>
              <div style={{ width: '100%', height: 380 }}>
                <ResponsiveContainer>
                  <LineChart data={evolutionData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `S/${v}`} />
                    <Tooltip content={<SimpleTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="Total Ventas" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Total Gastos" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}

        {/* Table */}
        {byDay.length > 0 ? (
          <div style={{ fontSize: 11 }} className="data-table-compact">
            <DataTable columns={cols} data={byDay} />
          </div>
        ) : (
          <p className="data-table__empty">Sin datos para el período seleccionado</p>
        )}
        <div className="report-summary mt-4">
          <div className="report-summary__divider" />
          <p className="label mb-2" style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>Registro Contable</p>
          <div className="report-row--bold">
            <span>Total Ventas</span>
            <span>{fmtMoney((totals.total_cash_sales ?? 0) + (totals.total_other_sales ?? 0))}</span>
          </div>
          <div className="report-row--bold">
            <span>Total Gastos</span>
            <span>{fmtMoney(totals.total_all_expenses ?? 0)}</span>
          </div>
          <div className="report-summary__divider" />
          <div className="report-row--bold" style={{ color: ((totals.total_cash_sales ?? 0) + (totals.total_other_sales ?? 0) - (totals.total_all_expenses ?? 0)) >= 0 ? '#065f46' : '#991b1b' }}>
            <span>Resultado Contable</span>
            <span>{fmtMoney((totals.total_cash_sales ?? 0) + (totals.total_other_sales ?? 0) - (totals.total_all_expenses ?? 0))}</span>
          </div>
        </div>
      </div>
    )
  }

  /* ── RENDER: Cancellations & Discounts ── */
  const renderCancellationsDiscounts = () => {
    if (!data || typeof data !== 'object') return null

    const cancelled = data.cancelled_orders || {}
    const discounts = data.discounts_applied || {}

    const cancelCols = [
      { key: 'order_id', label: 'Pedido' },
      { key: 'total', label: 'Total', render: (r) => fmtMoney(r.total) },
      { key: 'cancelled_at', label: 'Fecha Cancelación', render: (r) => fmtDate(r.cancelled_at) },
      { key: 'cancelled_by', label: 'Cancelado por' },
      { key: 'reason', label: 'Motivo' },
    ]

    const discountCols = [
      { key: 'order_id', label: 'Pedido' },
      { key: 'discount_percentage', label: '% Descuento', render: (r) => fmtPct(r.discount_percentage) },
      { key: 'discount_amount', label: 'Monto Descuento', render: (r) => fmtMoney(r.discount_amount) },
      { key: 'applied_by', label: 'Aplicado por' },
    ]

    return (
      <div>
        <p className="label mt-2 mb-1">Cancelaciones</p>
        <div className="report-summary mb-3" style={{ maxWidth: 320 }}>
          <div className="report-row">
            <span>Cantidad</span><span>{cancelled.count ?? '—'}</span>
          </div>
          <div className="report-row">
            <span>Monto Total</span><span>{fmtMoney(cancelled.total_amount)}</span>
          </div>
        </div>
        {cancelled.details?.length > 0 ? (
          <DataTable columns={cancelCols} data={cancelled.details} />
        ) : (
          <p className="data-table__empty">Sin cancelaciones en el período</p>
        )}

        <p className="label mt-4 mb-1">Descuentos</p>
        <div className="report-summary mb-3" style={{ maxWidth: 320 }}>
          <div className="report-row">
            <span>Cantidad</span><span>{discounts.count ?? '—'}</span>
          </div>
          <div className="report-row">
            <span>Monto Total</span><span>{fmtMoney(discounts.total_discount_amount)}</span>
          </div>
          <div className="report-row">
            <span>% Descuento Promedio</span><span>{fmtPct(discounts.average_discount_percentage)}</span>
          </div>
        </div>
        {discounts.details?.length > 0 ? (
          <DataTable columns={discountCols} data={discounts.details} />
        ) : (
          <p className="data-table__empty">Sin descuentos en el período</p>
        )}
      </div>
    )
  }

  /* ── RENDER: Accounts Payable ── */
  const renderAccountsPayable = () => {
    if (!data || typeof data !== 'object') return null

    const summary = data.summary || {}
    const bySupplier = data.by_supplier || []

    const supplierExpenseCols = [
      { key: 'id', label: 'ID' },
      { key: 'description', label: 'Descripción' },
      { key: 'amount', label: 'Monto Total', render: (r) => fmtMoney(r.amount) },
      { key: 'paid_amount', label: 'Pagado', render: (r) => fmtMoney(r.paid_amount) },
      { key: 'remaining', label: 'Pendiente', render: (r) => fmtMoney(r.remaining) },
      { key: 'status', label: 'Estado', render: (r) => fmtStatus(r.status) },
      { key: 'expense_date', label: 'Fecha', render: (r) => fmtDate(r.expense_date) },
    ]

    return (
      <div>
        <div className="report-summary mb-4">
          <div className="report-row">
            <span>Total Pendiente</span><span>{fmtMoney(summary.total_pending)}</span>
          </div>
          <div className="report-row">
            <span>Gastos Pendientes</span><span>{summary.count_pending ?? '—'}</span>
          </div>
        </div>

        {bySupplier.length > 0 ? (
          bySupplier.map((sup) => (
            <div key={sup.supplier_id || sup.supplier_name} className="mb-4">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p className="label">{sup.supplier_name || 'Sin proveedor'}</p>
                <span style={{ fontSize: 13 }}>Pendiente: <strong>{fmtMoney(sup.total_pending)}</strong> — {sup.count_expenses} gasto(s)</span>
              </div>
              {sup.expenses?.length > 0 ? (
                <DataTable columns={supplierExpenseCols} data={sup.expenses} />
              ) : (
                <p className="data-table__empty">Sin gastos pendientes</p>
              )}
            </div>
          ))
        ) : (
          <p className="data-table__empty">No hay cuentas por pagar</p>
        )}
      </div>
    )
  }

  /* ── MAIN RENDER ── */
  const renderReportData = () => {
    if (loading) return <div className="data-table__loading"><Spinner size="lg" /></div>
    if (!data) return <div className="data-table__empty">Selecciona las fechas y genera el reporte</div>

    switch (activeReport) {
      case 'dailySummary': return renderDailySummary()
      case 'salesByCategory': return renderSalesByCategory()
      case 'salesByHour': return renderSalesByHour()
      case 'salesByWaiter': return renderSalesByWaiter()
      case 'topProducts': return renderTopProducts()
      case 'dailyCashFlow': return renderDailyCashFlow()
      case 'cancellationsDiscounts': return renderCancellationsDiscounts()
      case 'accountsPayable': return renderAccountsPayable()
      default: return <div className="data-table__empty">Reporte no disponible</div>
    }
  }

  return (
    <div>
      <div className="admin-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Análisis y estadísticas del restaurante</p>
        </div>
      </div>

      {/* Report selector */}
      <div className="report-tabs">
        {REPORT_TYPES.map((rt) => {
          const Icon = rt.icon
          return (
            <button key={rt.key}
              className={`report-tab${activeReport === rt.key ? ' report-tab--active' : ''}`}
              onClick={() => { setActiveReport(rt.key); setData(null) }}>
              <Icon className="sidebar__link-icon" />
              <span>{rt.label}</span>
            </button>
          )
        })}
      </div>

      {/* Date filters */}
      <div className="filters-bar mt-4">
        {reportConfig?.dateType === 'range' && (
          <>
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
          </>
        )}
        {reportConfig?.dateType === 'single' && (
          <div>
            <label className="label">Fecha</label>
            <input type="date" className="input filters-bar__select" value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)} />
          </div>
        )}
        <div className="flex items-end gap-2">
          <button onClick={fetchReport} className="btn-primary" disabled={loading}>
            {loading ? 'Generando...' : 'Generar Reporte'}
          </button>
          {activeReport === 'dailyCashFlow' && data && (
            <button onClick={handleExportCashFlowPdf} className="btn-secondary" disabled={exportingPdf}>
              <Download className="sidebar__link-icon" />
              {exportingPdf ? 'Exportando...' : 'Exportar PDF'}
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="card mt-4">
        {renderReportData()}
      </div>
    </div>
  )
}
