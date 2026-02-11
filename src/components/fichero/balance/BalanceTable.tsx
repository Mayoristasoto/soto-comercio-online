import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  CheckCircle, AlertCircle, XCircle, Coffee, TrendingUp, TrendingDown, Minus, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { EmpleadoBalanceDia, SortField, SortDir } from "./types"

interface Props {
  empleados: EmpleadoBalanceDia[]
}

const fmtMin = (m: number): string => {
  if (m === 0) return '-'
  return `${Math.floor(Math.abs(m) / 60)}h ${Math.abs(m) % 60}m`
}

const fmtDiff = (m: number): string => {
  if (m === 0) return '0'
  return `${m > 0 ? '+' : '-'}${Math.floor(Math.abs(m) / 60)}h ${Math.abs(m) % 60}m`
}

export function BalanceTable({ empleados }: Props) {
  const [sortBy, setSortBy] = useState<SortField>('nombre')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
  }

  const sorted = [...empleados].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    switch (sortBy) {
      case 'nombre': return dir * `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)
      case 'sucursal': return dir * (a.sucursal_nombre || '').localeCompare(b.sucursal_nombre || '')
      case 'entrada': return dir * (a.hora_entrada || '99:99').localeCompare(b.hora_entrada || '99:99')
      case 'salida': return dir * (a.hora_salida || '99:99').localeCompare(b.hora_salida || '99:99')
      case 'trabajadas': return dir * (a.minutos_trabajados - b.minutos_trabajados)
      case 'balance': return dir * (a.diferencia_minutos - b.diferencia_minutos)
      default: return 0
    }
  })

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />
  }

  const SortableHead = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead
      className={cn("cursor-pointer select-none hover:bg-muted/50 transition-colors", className)}
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center">{children}<SortIcon field={field} /></span>
    </TableHead>
  )

  const getRowBg = (emp: EmpleadoBalanceDia) => {
    if (emp.estado !== 'completo') return ''
    if (emp.diferencia_minutos > 15) return 'bg-green-50/60 dark:bg-green-950/10'
    if (emp.diferencia_minutos < -15) return 'bg-red-50/60 dark:bg-red-950/10'
    return ''
  }

  const getEstadoBadge = (estado: EmpleadoBalanceDia['estado']) => {
    switch (estado) {
      case 'completo': return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completo</Badge>
      case 'sin_salida': return <Badge className="bg-orange-100 text-orange-800"><AlertCircle className="h-3 w-3 mr-1" />Sin salida</Badge>
      case 'sin_entrada': return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Sin entrada</Badge>
      case 'solo_pausa': return <Badge className="bg-purple-100 text-purple-800"><Coffee className="h-3 w-3 mr-1" />Solo pausa</Badge>
      default: return <Badge variant="secondary">No fichó</Badge>
    }
  }

  const getDiffBadge = (m: number, estado: EmpleadoBalanceDia['estado']) => {
    if (estado !== 'completo') return null
    if (m > 15) return <span className="flex items-center text-green-600 font-medium"><TrendingUp className="h-4 w-4 mr-1" />{fmtDiff(m)}</span>
    if (m < -15) return <span className="flex items-center text-red-600 font-medium"><TrendingDown className="h-4 w-4 mr-1" />{fmtDiff(m)}</span>
    return <span className="flex items-center text-muted-foreground"><Minus className="h-4 w-4 mr-1" />{fmtDiff(m)}</span>
  }

  const getPunctuality = (emp: EmpleadoBalanceDia) => {
    if (!emp.hora_entrada || !emp.hora_entrada_programada) return null
    const [rh, rm] = emp.hora_entrada.split(':').map(Number)
    const [ph, pm] = emp.hora_entrada_programada.split(':').map(Number)
    const diff = (rh * 60 + rm) - (ph * 60 + pm)
    if (diff <= 0) return <span className="text-green-600 text-xs">Puntual</span>
    if (diff <= 10) return <span className="text-orange-500 text-xs">+{diff}m</span>
    return <span className="text-red-500 text-xs">+{diff}m tarde</span>
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead field="nombre">Empleado</SortableHead>
              <SortableHead field="sucursal">Sucursal</SortableHead>
              <SortableHead field="entrada" className="text-center">Entrada</SortableHead>
              <SortableHead field="salida" className="text-center">Salida</SortableHead>
              <TableHead className="text-center">Pausa</TableHead>
              <SortableHead field="trabajadas" className="text-center">Hs. Efectivas</SortableHead>
              <TableHead className="text-center">Esperadas</TableHead>
              <SortableHead field="balance" className="text-center">Balance</SortableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No hay datos para mostrar
                </TableCell>
              </TableRow>
            ) : (
              sorted.map(emp => (
                <TableRow key={emp.empleado_id} className={cn(emp.estado === 'no_ficho' && 'opacity-50', getRowBg(emp))}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={emp.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{emp.nombre.charAt(0)}{emp.apellido.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{emp.apellido}, {emp.nombre}</div>
                        {getPunctuality(emp)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{emp.sucursal_nombre || '-'}</TableCell>
                  <TableCell className="text-center font-mono text-sm">{emp.hora_entrada || '-'}</TableCell>
                  <TableCell className="text-center font-mono text-sm">{emp.hora_salida || '-'}</TableCell>
                  <TableCell className="text-center text-sm">
                    {emp.minutos_pausa > 0 ? <span className="text-purple-600">{fmtMin(emp.minutos_pausa)}</span> : '-'}
                  </TableCell>
                  <TableCell className="text-center font-medium text-sm">
                    {emp.estado === 'completo' ? fmtMin(emp.minutos_trabajados) : '-'}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground text-sm">{fmtMin(emp.minutos_esperados)}</TableCell>
                  <TableCell className="text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>{getDiffBadge(emp.diferencia_minutos, emp.estado)}</span>
                      </TooltipTrigger>
                      {emp.estado === 'completo' && (
                        <TooltipContent>
                          <p>Trabajadas: {fmtMin(emp.minutos_trabajados)}</p>
                          <p>Pausa: {fmtMin(emp.minutos_pausa)}</p>
                          <p>Esperadas: {fmtMin(emp.minutos_esperados)}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-center">{getEstadoBadge(emp.estado)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}
