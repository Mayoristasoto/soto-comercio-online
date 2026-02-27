import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/integrations/supabase/client"
import { format, startOfMonth, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { PDF_STYLES, COMPANY_INFO } from "@/utils/pdfStyles"
import {
  Clock,
  Download,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Users,
  Timer,
  TrendingUp,
  Calendar,
  FileText,
  FileSpreadsheet,
  MoreHorizontal,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "sonner"

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface LlegadaTarde {
  id: string
  fecha: string
  minutos: number
  observaciones: string
  horaReal: string
  horaProgramada: string
}

interface GerenteReporte {
  id: string
  nombre: string
  apellido: string
  sucursal: string
  llegadasTarde: LlegadaTarde[]
  totalMinutos: number
  cantidadVeces: number
  porcentaje: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

function parsearObservaciones(obs: string): { horaReal: string; horaProgramada: string } {
  if (!obs) return { horaReal: "—", horaProgramada: "—" }
  const horaRealMatch = obs.match(/:\s*(\d{1,2}:\d{2}(?:\s*[ap]\.\s*m\.)?)/i)
  const programadoMatch = obs.match(/programado:\s*(\d{1,2}:\d{2})/i)
  return {
    horaReal: horaRealMatch ? horaRealMatch[1].trim() : "—",
    horaProgramada: programadoMatch ? programadoMatch[1] : "—",
  }
}

function colorMinutos(min: number): string {
  if (min > 60) return "bg-destructive/15 text-destructive font-semibold"
  if (min > 30) return "bg-warning/15 text-warning font-medium"
  return "bg-muted text-muted-foreground"
}

// ─── Logo loader ──────────────────────────────────────────────────────────────

const loadLogo = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL("image/jpeg"))
      } else resolve(null)
    }
    img.onerror = () => resolve(null)
    img.src = COMPANY_INFO.logo
  })
}

// ─── PDF Ejecutivo ────────────────────────────────────────────────────────────

async function generarPDFEjecutivo(
  gerentes: GerenteReporte[],
  diasHabiles: number,
  fechaDesde: string,
  fechaHasta: string
) {
  const doc = new jsPDF({ format: "a4", orientation: "portrait", unit: "mm" })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const m = PDF_STYLES.spacing.page
  const colors = PDF_STYLES.colors

  const totalLlegadas = gerentes.reduce((s, g) => s + g.cantidadVeces, 0)
  const totalMin = gerentes.reduce((s, g) => s + g.totalMinutos, 0)
  const peor = gerentes[0]
  const logo = await loadLogo()

  // ── Page 1: Header ──
  doc.setFillColor(75, 13, 109)
  doc.rect(0, 0, pageW, 45, "F")

  if (logo) doc.addImage(logo, "JPEG", m.left, 8, 30, 30)

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("REPORTE EJECUTIVO", logo ? m.left + 35 : m.left, 18)
  doc.setFontSize(13)
  doc.text("Llegadas Tarde — Gerentes de Sucursal", logo ? m.left + 35 : m.left, 27)

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text(COMPANY_INFO.fullName, logo ? m.left + 35 : m.left, 35)
  doc.text(
    `Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`,
    logo ? m.left + 35 : m.left,
    41
  )

  // Period info
  let y = 55
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(m.left, y, pageW - m.left - m.right, 16, 3, 3, "F")
  doc.setDrawColor(149, 25, 141)
  doc.setLineWidth(0.5)
  doc.roundedRect(m.left, y, pageW - m.left - m.right, 16, 3, 3, "S")

  doc.setTextColor(75, 13, 109)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("Período:", m.left + 5, y + 10)
  doc.setTextColor(39, 44, 77)
  doc.setFont("helvetica", "normal")
  doc.text(
    `${format(parseISO(fechaDesde), "dd/MM/yyyy")} al ${format(parseISO(fechaHasta), "dd/MM/yyyy")}  ·  ${diasHabiles} días hábiles`,
    m.left + 35,
    y + 10
  )

  // Summary cards
  y = 82
  doc.setFillColor(75, 13, 109)
  doc.rect(m.left, y, pageW - m.left - m.right, 8, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("RESUMEN EJECUTIVO", m.left + 5, y + 6)

  y += 14
  const summaryData = [
    ["Gerentes con incidencias", `${gerentes.length}`],
    ["Total llegadas tarde", `${totalLlegadas}`],
    ["Total minutos acumulados", `${totalMin.toLocaleString()} min`],
    ["Mayor infractor", peor ? `${peor.nombre} ${peor.apellido} (${peor.cantidadVeces} veces · ${peor.totalMinutos} min)` : "—"],
    ["Promedio minutos/vez (global)", totalLlegadas > 0 ? `${Math.round(totalMin / totalLlegadas)} min` : "—"],
  ]

  autoTable(doc, {
    body: summaryData,
    startY: y,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 70, textColor: [39, 44, 77] },
      1: { cellWidth: 80, halign: "center", textColor: [75, 13, 109], fontStyle: "bold" },
    },
    margin: { left: m.left + 5, right: m.right },
  })

  // ── Page 2: Summary Table per Manager ──
  doc.addPage()
  doc.setFillColor(75, 13, 109)
  doc.rect(0, 0, pageW, 18, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("RESUMEN POR GERENTE", m.left, 12)

  const resumenRows = gerentes.map(g => [
    `${g.nombre} ${g.apellido}`,
    g.sucursal,
    `${g.cantidadVeces}`,
    `${g.totalMinutos}`,
    `${((g.cantidadVeces / diasHabiles) * 100).toFixed(1)}%`,
    g.cantidadVeces > 0 ? `${Math.round(g.totalMinutos / g.cantidadVeces)}` : "0",
  ])

  autoTable(doc, {
    head: [["Gerente", "Sucursal", "Llegadas", "Total Min", "% Días", "Prom Min"]],
    body: resumenRows,
    startY: 25,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [149, 25, 141], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 245, 255] },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 35 },
      2: { cellWidth: 22, halign: "center" },
      3: { cellWidth: 22, halign: "center", textColor: [224, 68, 3], fontStyle: "bold" },
      4: { cellWidth: 22, halign: "center" },
      5: { cellWidth: 22, halign: "center" },
    },
    margin: { left: m.left, right: m.right },
  })

  // ── Page 3+: Daily Detail per Manager ──
  gerentes.forEach(g => {
    doc.addPage()
    doc.setFillColor(75, 13, 109)
    doc.rect(0, 0, pageW, 18, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text(`DETALLE: ${g.nombre} ${g.apellido}`, m.left, 12)
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.text(g.sucursal, pageW - m.right - 40, 12)

    const rows = g.llegadasTarde.map(lt => {
      const fecha = parseISO(lt.fecha.substring(0, 10))
      return [
        format(fecha, "dd/MM/yyyy"),
        DIAS_SEMANA[fecha.getDay()],
        lt.horaProgramada,
        lt.horaReal,
        `${lt.minutos} min`,
      ]
    })

    autoTable(doc, {
      head: [["Fecha", "Día", "H. Programada", "H. Real", "Min Tarde"]],
      body: rows,
      startY: 25,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [149, 25, 141], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 245, 255] },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 28 },
        2: { cellWidth: 30, halign: "center" },
        3: { cellWidth: 30, halign: "center" },
        4: { cellWidth: 25, halign: "center", textColor: [224, 68, 3], fontStyle: "bold" },
      },
      margin: { left: m.left, right: m.right },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          const val = parseInt(data.cell.raw as string)
          if (val >= 30) {
            data.cell.styles.textColor = [224, 68, 3]
            data.cell.styles.fontStyle = "bold"
          }
        }
      },
    })
  })

  // Footer on all pages
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(150, 150, 150)
    doc.text(
      `${COMPANY_INFO.fullName} — Documento confidencial — Página ${i} de ${totalPages}`,
      pageW / 2,
      pageH - 8,
      { align: "center" }
    )
  }

  const periodo = `${fechaDesde}_${fechaHasta}`
  doc.save(`Reporte_Ejecutivo_Llegadas_Tarde_Gerentes_${periodo}.pdf`)
}

// ─── Exportación XLSX ─────────────────────────────────────────────────────────

function exportarXLSX(gerentes: GerenteReporte[], diasHabiles: number, fechaDesde: string, fechaHasta: string) {
  const wb = XLSX.utils.book_new()

  const resumenHeader = [
    "Gerente", "Sucursal", "Llegadas Tarde", "% Días Tarde", "Total Min Tarde", "Promedio Min/Vez"
  ]
  const resumenRows = gerentes.map(g => [
    `${g.nombre} ${g.apellido}`,
    g.sucursal,
    g.cantidadVeces,
    `${((g.cantidadVeces / diasHabiles) * 100).toFixed(1)}%`,
    g.totalMinutos,
    g.cantidadVeces > 0 ? Math.round(g.totalMinutos / g.cantidadVeces) : 0,
  ])
  const wsResumen = XLSX.utils.aoa_to_sheet([resumenHeader, ...resumenRows])
  wsResumen["!cols"] = [{ wch: 28 }, { wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen")

  const detalleHeader = [
    "Gerente", "Sucursal", "Fecha", "Día Semana", "Hora Programada", "Hora Real", "Minutos Tarde"
  ]
  const detalleRows: (string | number)[][] = []
  gerentes.forEach(g => {
    g.llegadasTarde.forEach(lt => {
      const fecha = parseISO(lt.fecha.substring(0, 10))
      detalleRows.push([
        `${g.nombre} ${g.apellido}`,
        g.sucursal,
        format(fecha, "dd/MM/yyyy"),
        DIAS_SEMANA[fecha.getDay()],
        lt.horaProgramada,
        lt.horaReal,
        lt.minutos,
      ])
    })
  })
  detalleRows.sort((a, b) => String(a[2]).localeCompare(String(b[2])))
  const wsDetalle = XLSX.utils.aoa_to_sheet([detalleHeader, ...detalleRows])
  wsDetalle["!cols"] = [{ wch: 28 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle por Día")

  const start = parseISO(fechaDesde)
  const end = parseISO(fechaHasta)
  const diasDelPeriodo: Date[] = []
  let cur = new Date(start)
  while (cur <= end) {
    diasDelPeriodo.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  const calHeader = ["Gerente", "Sucursal", ...diasDelPeriodo.map(d => format(d, "dd/MM"))]
  const calRows = gerentes.map(g => {
    const mapaMinutos: Record<string, number> = {}
    g.llegadasTarde.forEach(lt => {
      const key = lt.fecha.substring(0, 10)
      mapaMinutos[key] = lt.minutos
    })
    return [
      `${g.nombre} ${g.apellido}`,
      g.sucursal,
      ...diasDelPeriodo.map(d => {
        const key = format(d, "yyyy-MM-dd")
        return mapaMinutos[key] !== undefined ? mapaMinutos[key] : ""
      })
    ]
  })
  const wsCalendario = XLSX.utils.aoa_to_sheet([calHeader, ...calRows])
  wsCalendario["!cols"] = [{ wch: 28 }, { wch: 20 }, ...diasDelPeriodo.map(() => ({ wch: 7 }))]
  XLSX.utils.book_append_sheet(wb, wsCalendario, "Calendario")

  const periodo = `${fechaDesde}_${fechaHasta}`
  XLSX.writeFile(wb, `Reporte_Llegadas_Tarde_Gerentes_${periodo}.xlsx`)
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ReporteLlegadasTardeGerentes() {
  const hoy = format(new Date(), "yyyy-MM-dd")
  const inicioMes = format(startOfMonth(new Date()), "yyyy-MM-dd")

  const [fechaDesde, setFechaDesde] = useState(inicioMes)
  const [fechaHasta, setFechaHasta] = useState(hoy)
  const [diasHabiles, setDiasHabiles] = useState(20)
  const [gerentes, setGerentes] = useState<GerenteReporte[]>([])
  const [loading, setLoading] = useState(true)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  
  // Annul state
  const [anularId, setAnularId] = useState<string | null>(null)
  const [anulando, setAnulando] = useState(false)

  const toggleExpand = (id: string) => {
    setExpandidos(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("empleado_cruces_rojas")
        .select(`
          id,
          empleado_id,
          fecha_infraccion,
          minutos_diferencia,
          observaciones,
          empleados!empleado_cruces_rojas_empleado_id_fkey(
            nombre, apellido, rol,
            sucursales(nombre)
          )
        `)
        .eq("tipo_infraccion", "llegada_tarde")
        .eq("anulada", false)
        .gte("fecha_infraccion", fechaDesde)
        .lte("fecha_infraccion", fechaHasta + "T23:59:59")

      if (error) throw error

      const soloGerentes = (data || []).filter(
        (row: any) => row.empleados?.rol === "gerente_sucursal"
      )

      const mapa: Record<string, GerenteReporte> = {}
      soloGerentes.forEach((row: any) => {
        const emp = row.empleados
        if (!emp) return
        const sucursal = emp.sucursales?.nombre || "Sin sucursal"
        const key = row.empleado_id
        if (!mapa[key]) {
          mapa[key] = {
            id: key,
            nombre: emp.nombre,
            apellido: emp.apellido,
            sucursal,
            llegadasTarde: [],
            totalMinutos: 0,
            cantidadVeces: 0,
            porcentaje: 0,
          }
        }
        const { horaReal, horaProgramada } = parsearObservaciones(row.observaciones || "")
        mapa[key].llegadasTarde.push({
          id: row.id,
          fecha: row.fecha_infraccion,
          minutos: row.minutos_diferencia || 0,
          observaciones: row.observaciones || "",
          horaReal,
          horaProgramada,
        })
        mapa[key].totalMinutos += row.minutos_diferencia || 0
        mapa[key].cantidadVeces += 1
      })

      const lista = Object.values(mapa).map(g => ({
        ...g,
        llegadasTarde: g.llegadasTarde.sort((a, b) => a.fecha.localeCompare(b.fecha)),
        porcentaje: parseFloat(((g.cantidadVeces / diasHabiles) * 100).toFixed(1)),
      }))

      lista.sort((a, b) => b.totalMinutos - a.totalMinutos)
      setGerentes(lista)
    } catch (err) {
      console.error("Error cargando reporte:", err)
    } finally {
      setLoading(false)
    }
  }, [fechaDesde, fechaHasta, diasHabiles])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // ── Anular llegada tarde ──
  const handleAnular = async () => {
    if (!anularId) return
    setAnulando(true)
    try {
      // Get current user's employee ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")

      const { data: empData } = await supabase
        .from("empleados")
        .select("id")
        .eq("user_id", user.id)
        .single()

      const { error } = await supabase
        .from("empleado_cruces_rojas")
        .update({
          anulada: true,
          motivo_anulacion: "Anulada desde reporte de gerentes",
          anulada_por: empData?.id || null,
        })
        .eq("id", anularId)

      if (error) throw error

      toast.success("Llegada tarde anulada correctamente")
      setAnularId(null)
      cargarDatos()
    } catch (err: any) {
      console.error("Error anulando:", err)
      toast.error("Error al anular", { description: err.message })
    } finally {
      setAnulando(false)
    }
  }

  // ── Métricas globales ──
  const totalLlegadas = gerentes.reduce((s, g) => s + g.cantidadVeces, 0)
  const totalMinutos = gerentes.reduce((s, g) => s + g.totalMinutos, 0)
  const masIncidencias = gerentes[0]

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Cabecera ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-destructive" />
            Reporte de Llegadas Tarde — Gerentes de Sucursal
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Detalle día a día + totales y porcentajes por gerente
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={loading || gerentes.length === 0} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => generarPDFEjecutivo(gerentes, diasHabiles, fechaDesde, fechaHasta)}>
              <FileText className="h-4 w-4 mr-2" />
              Exportar PDF Ejecutivo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportarXLSX(gerentes, diasHabiles, fechaDesde, fechaHasta)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar XLSX
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Filtros ── */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Desde</Label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Hasta</Label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Días hábiles del período</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={diasHabiles}
                onChange={e => setDiasHabiles(Number(e.target.value))}
                className="w-24"
              />
            </div>
            <Button variant="outline" onClick={cargarDatos} className="mb-0.5">
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Métricas ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary opacity-80" />
              <div>
                <p className="text-xs text-muted-foreground">Gerentes con incidencias</p>
                {loading ? <Skeleton className="h-7 w-8 mt-1" /> : (
                  <p className="text-2xl font-bold">{gerentes.length}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-chart-4 opacity-80" />
              <div>
                <p className="text-xs text-muted-foreground">Total llegadas tarde</p>
                {loading ? <Skeleton className="h-7 w-8 mt-1" /> : (
                  <p className="text-2xl font-bold">{totalLlegadas}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Timer className="h-8 w-8 text-destructive opacity-80" />
              <div>
                <p className="text-xs text-muted-foreground">Total minutos acumulados</p>
                {loading ? <Skeleton className="h-7 w-16 mt-1" /> : (
                  <p className="text-2xl font-bold">{totalMinutos.toLocaleString()}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-chart-5 opacity-80" />
              <div>
                <p className="text-xs text-muted-foreground">Mayor infractor</p>
                {loading ? <Skeleton className="h-5 w-28 mt-1" /> : masIncidencias ? (
                  <p className="text-sm font-semibold leading-tight mt-1">
                    {masIncidencias.nombre} {masIncidencias.apellido}
                    <span className="block text-xs text-muted-foreground font-normal">
                      {masIncidencias.cantidadVeces} vez{masIncidencias.cantidadVeces !== 1 ? "es" : ""}
                      &nbsp;·&nbsp;{masIncidencias.totalMinutos} min
                    </span>
                  </p>
                ) : <p className="text-sm text-muted-foreground mt-1">—</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabla principal ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Detalle por Gerente
            <span className="text-xs font-normal text-muted-foreground ml-1">
              (click en fila para expandir)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : gerentes.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No hay llegadas tarde de gerentes en el período seleccionado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 w-8"></th>
                    <th className="text-left px-4 py-3 font-semibold">Gerente</th>
                    <th className="text-left px-4 py-3 font-semibold">Sucursal</th>
                    <th className="text-center px-4 py-3 font-semibold">Llegadas Tarde</th>
                    <th className="text-center px-4 py-3 font-semibold">Total Min</th>
                    <th className="text-center px-4 py-3 font-semibold">% Días Tarde</th>
                    <th className="text-center px-4 py-3 font-semibold">Prom. Min/Vez</th>
                  </tr>
                </thead>
                <tbody>
                  {gerentes.map((g, idx) => {
                    const isOpen = expandidos.has(g.id)
                    const porcentaje = ((g.cantidadVeces / diasHabiles) * 100).toFixed(1)
                    const promedio = g.cantidadVeces > 0 ? Math.round(g.totalMinutos / g.cantidadVeces) : 0
                    return (
                      <>
                        <tr
                          key={g.id}
                          onClick={() => toggleExpand(g.id)}
                          className={`border-b cursor-pointer transition-colors hover:bg-muted/30 ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                        >
                          <td className="px-4 py-3 text-muted-foreground">
                            {isOpen
                              ? <ChevronDown className="h-4 w-4" />
                              : <ChevronRight className="h-4 w-4" />}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {g.nombre} {g.apellido}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{g.sucursal}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className="font-mono">
                              {g.cantidadVeces}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs ${colorMinutos(g.totalMinutos / (g.cantidadVeces || 1))}`}>
                              {g.totalMinutos} min
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-semibold ${parseFloat(porcentaje) >= 30 ? "text-destructive" : parseFloat(porcentaje) >= 15 ? "text-orange-600 dark:text-orange-400" : "text-yellow-600 dark:text-yellow-400"}`}>
                              {porcentaje}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-muted-foreground text-xs">
                            {promedio} min
                          </td>
                        </tr>

                        {/* Fila expandida: detalle día a día */}
                        {isOpen && (
                          <tr key={g.id + "-detail"} className="bg-muted/5">
                            <td colSpan={7} className="px-6 py-3">
                              <div className="rounded-md border overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-muted/50 border-b">
                                      <th className="text-left px-3 py-2 font-semibold">Fecha</th>
                                      <th className="text-left px-3 py-2 font-semibold">Día</th>
                                      <th className="text-center px-3 py-2 font-semibold">H. Programada</th>
                                      <th className="text-center px-3 py-2 font-semibold">H. Real</th>
                                      <th className="text-center px-3 py-2 font-semibold">Min Tarde</th>
                                      <th className="text-left px-3 py-2 font-semibold">Observaciones</th>
                                      <th className="w-10 px-2 py-2"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {g.llegadasTarde.map((lt, i) => {
                                      const fecha = parseISO(lt.fecha.substring(0, 10))
                                      return (
                                        <tr key={lt.id} className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                                          <td className="px-3 py-2 font-mono">
                                            {format(fecha, "dd/MM/yyyy")}
                                          </td>
                                          <td className="px-3 py-2 text-muted-foreground">
                                            {DIAS_SEMANA[fecha.getDay()]}
                                          </td>
                                          <td className="px-3 py-2 text-center font-mono">{lt.horaProgramada}</td>
                                          <td className="px-3 py-2 text-center font-mono">{lt.horaReal}</td>
                                          <td className="px-3 py-2 text-center">
                                            <span className={`px-2 py-0.5 rounded ${colorMinutos(lt.minutos)}`}>
                                              {lt.minutos} min
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-muted-foreground max-w-xs truncate" title={lt.observaciones}>
                                            {lt.observaciones || "—"}
                                          </td>
                                          <td className="px-2 py-2">
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-7 w-7"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    setAnularId(lt.id)
                                                  }}
                                                  className="text-destructive focus:text-destructive"
                                                >
                                                  <Trash2 className="h-4 w-4 mr-2" />
                                                  Eliminar llegada tarde
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Leyenda ── */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Referencia de colores:</span>
        <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">1–30 min</span>
        <span className="px-2 py-0.5 rounded bg-chart-4/15 text-chart-4">31–60 min</span>
        <span className="px-2 py-0.5 rounded bg-destructive/15 text-destructive">+60 min</span>
      </div>

      {/* ── Confirm Dialog para anular ── */}
      <ConfirmDialog
        open={anularId !== null}
        onOpenChange={(open) => { if (!open) setAnularId(null) }}
        title="¿Eliminar esta llegada tarde?"
        description="Se marcará como anulada y no aparecerá en futuros reportes. Esta acción se registra en auditoría."
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        variant="destructive"
        loading={anulando}
        onConfirm={handleAnular}
      />
    </div>
  )
}
