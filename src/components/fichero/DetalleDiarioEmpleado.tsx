import { useState, useEffect, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ResponsiveDialog } from "@/components/ui/responsive-dialog"
import { ExportButton } from "@/components/ui/export-button"
import { supabase } from "@/integrations/supabase/client"
import { format, startOfWeek, endOfMonth, eachDayOfInterval, getISOWeek } from "date-fns"
import { es } from "date-fns/locale"
import { getArgentinaStartOfDay, getArgentinaEndOfDay } from "@/lib/dateUtils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  empleadoId: string
  mes: string // yyyy-MM
  nombre: string
  apellido: string
  horasJornada: number
  horasSemanales: number | null
  diasLaboralesSemana: number
}

interface DiaDetalle {
  fecha: Date
  entrada: string | null
  salida: string | null
  minutosTrabajados: number
  diferenciaMinutos: number
}

const fmtMin = (m: number) => {
  if (m === 0) return '0h 0m'
  const sign = m < 0 ? '-' : ''
  const abs = Math.abs(m)
  return `${sign}${Math.floor(abs / 60)}h ${abs % 60}m`
}

const balanceColor = (m: number) =>
  m > 5 ? 'text-green-700 bg-green-50' : m < -5 ? 'text-red-700 bg-red-50' : 'text-muted-foreground'

export default function DetalleDiarioEmpleado({
  open, onOpenChange, empleadoId, mes, nombre, apellido, horasJornada, horasSemanales, diasLaboralesSemana
}: Props) {
  const [fichajes, setFichajes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const minutosEsperadosDia = useMemo(() => {
    if (horasSemanales) return (horasSemanales / diasLaboralesSemana) * 60
    return horasJornada * 60
  }, [horasJornada, horasSemanales, diasLaboralesSemana])

  const objetivoSemanal = horasSemanales || horasJornada * diasLaboralesSemana
  const horasEfectivasDia = minutosEsperadosDia / 60

  useEffect(() => {
    if (!open || !empleadoId) return
    const cargar = async () => {
      setLoading(true)
      const [year, month] = mes.split('-').map(Number)
      const primerDia = new Date(year, month - 1, 1)
      const ultimoDia = endOfMonth(primerDia)
      const { data } = await supabase
        .from('fichajes')
        .select('tipo, timestamp_real')
        .eq('empleado_id', empleadoId)
        .gte('timestamp_real', getArgentinaStartOfDay(primerDia))
        .lte('timestamp_real', getArgentinaEndOfDay(ultimoDia))
        .order('timestamp_real', { ascending: true })
      setFichajes(data || [])
      setLoading(false)
    }
    cargar()
  }, [open, empleadoId, mes])

  const { dias, semanas, totalMes } = useMemo(() => {
    const [year, month] = mes.split('-').map(Number)
    const primerDia = new Date(year, month - 1, 1)
    const ultimoDia = endOfMonth(primerDia)
    const todosDias = eachDayOfInterval({ start: primerDia, end: ultimoDia })

    // Group fichajes by day
    const porDia = new Map<string, any[]>()
    fichajes.forEach(f => {
      const key = f.timestamp_real.substring(0, 10)
      if (!porDia.has(key)) porDia.set(key, [])
      porDia.get(key)!.push(f)
    })

    const diasDetalle: DiaDetalle[] = todosDias.map(fecha => {
      const key = format(fecha, 'yyyy-MM-dd')
      const fichajesDia = porDia.get(key) || []
      const entrada = fichajesDia.find((f: any) => f.tipo === 'entrada')
      const salida = [...fichajesDia].reverse().find((f: any) => f.tipo === 'salida')

      let minutosTrabajados = 0
      if (entrada && salida) {
        const diff = new Date(salida.timestamp_real).getTime() - new Date(entrada.timestamp_real).getTime()
        minutosTrabajados = Math.round(diff / 60000)
        if (minutosTrabajados < 0) minutosTrabajados = 0
      }

      const entradaStr = entrada ? format(new Date(entrada.timestamp_real), 'HH:mm') : null
      const salidaStr = salida ? format(new Date(salida.timestamp_real), 'HH:mm') : null
      const diferencia = minutosTrabajados > 0 ? minutosTrabajados - minutosEsperadosDia : 0

      return { fecha, entrada: entradaStr, salida: salidaStr, minutosTrabajados, diferenciaMinutos: Math.round(diferencia) }
    })

    // Group by week
    const semanasMap = new Map<number, DiaDetalle[]>()
    diasDetalle.forEach(d => {
      const w = getISOWeek(d.fecha)
      if (!semanasMap.has(w)) semanasMap.set(w, [])
      semanasMap.get(w)!.push(d)
    })

    const semanasArr = Array.from(semanasMap.entries()).map(([weekNum, dias]) => {
      const diasConFichaje = dias.filter(d => d.minutosTrabajados > 0)
      const totalMin = diasConFichaje.reduce((s, d) => s + d.minutosTrabajados, 0)
      const balanceSemanal = totalMin - objetivoSemanal * 60
      return { weekNum, dias, totalMin, balanceSemanal, diasTrabajados: diasConFichaje.length }
    })

    const diasConFichaje = diasDetalle.filter(d => d.minutosTrabajados > 0)
    const totalMinMes = diasConFichaje.reduce((s, d) => s + d.minutosTrabajados, 0)

    return { dias: diasDetalle, semanas: semanasArr, totalMes: totalMinMes }
  }, [fichajes, mes, minutosEsperadosDia, objetivoSemanal])

  const diasConFichaje = dias.filter(d => d.minutosTrabajados > 0)
  const totalEsperado = diasConFichaje.length * minutosEsperadosDia
  const balanceTotal = Math.round(totalMes - totalEsperado)

  const datosExportar = dias.filter(d => d.minutosTrabajados > 0).map(d => ({
    'Fecha': format(d.fecha, 'EEEE dd/MM', { locale: es }),
    'Entrada': d.entrada || '-',
    'Salida': d.salida || '-',
    'Trabajó': fmtMin(d.minutosTrabajados),
    [`Dif vs ${horasEfectivasDia}hs`]: `${d.diferenciaMinutos > 0 ? '+' : ''}${fmtMin(d.diferenciaMinutos)}`,
  }))

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${apellido}, ${nombre} — ${format(new Date(mes + '-01'), 'MMMM yyyy', { locale: es })}`}
      description={`Jornada: ${horasJornada}hs | Objetivo semanal: ${objetivoSemanal}hs`}
      className="max-w-3xl max-h-[85vh]"
    >
      <div className="space-y-3 overflow-y-auto max-h-[65vh]">
        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{diasConFichaje.length} días trabajados</Badge>
          <Badge variant="outline">Total: {fmtMin(totalMes)}</Badge>
          <Badge variant="outline" className={balanceColor(balanceTotal)}>
            {balanceTotal > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : balanceTotal < -5 ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
            Balance: {balanceTotal > 0 ? '+' : ''}{fmtMin(balanceTotal)}
          </Badge>
          <ExportButton data={datosExportar} filename={`detalle_${apellido}_${nombre}_${mes}`} sheetName="Detalle Diario" />
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Cargando detalle...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Salida</TableHead>
                <TableHead>Trabajó</TableHead>
                <TableHead>Dif vs {horasJornada}hs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {semanas.map(semana => (
                <>
                  {semana.dias.filter(d => d.minutosTrabajados > 0 || d.entrada).map(d => (
                    <TableRow key={d.fecha.toISOString()}>
                      <TableCell className="text-sm font-medium capitalize">
                        {format(d.fecha, 'EEE dd/MM', { locale: es })}
                      </TableCell>
                      <TableCell className="text-sm">{d.entrada || '-'}</TableCell>
                      <TableCell className="text-sm">{d.salida || '-'}</TableCell>
                      <TableCell className="text-sm font-medium">{d.minutosTrabajados > 0 ? fmtMin(d.minutosTrabajados) : '-'}</TableCell>
                      <TableCell>
                        {d.minutosTrabajados > 0 ? (
                          <Badge variant="outline" className={`text-xs font-mono ${balanceColor(d.diferenciaMinutos)}`}>
                            {d.diferenciaMinutos > 0 ? '+' : ''}{fmtMin(d.diferenciaMinutos)}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Weekly subtotal */}
                  {semana.diasTrabajados > 0 && (
                    <TableRow key={`week-${semana.weekNum}`} className="bg-muted/50 font-semibold">
                      <TableCell colSpan={3} className="text-sm">
                        Semana {semana.weekNum} ({semana.diasTrabajados} días)
                      </TableCell>
                      <TableCell className="text-sm">{fmtMin(semana.totalMin)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs font-mono ${balanceColor(semana.balanceSemanal)}`}>
                          {semana.balanceSemanal > 0 ? '+' : ''}{fmtMin(semana.balanceSemanal)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
              {/* Monthly total */}
              <TableRow className="bg-muted font-bold border-t-2">
                <TableCell colSpan={3} className="text-sm">TOTAL MES ({diasConFichaje.length} días)</TableCell>
                <TableCell className="text-sm">{fmtMin(totalMes)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs font-mono ${balanceColor(balanceTotal)}`}>
                    {balanceTotal > 0 ? '+' : ''}{fmtMin(balanceTotal)}
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </div>
    </ResponsiveDialog>
  )
}
