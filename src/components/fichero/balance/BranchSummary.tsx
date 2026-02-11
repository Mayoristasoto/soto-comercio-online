import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, Building2 } from "lucide-react"
import { useState } from "react"
import { EmpleadoBalanceDia } from "./types"

interface Props {
  empleados: EmpleadoBalanceDia[]
}

interface SucursalResumen {
  nombre: string
  total: number
  presentes: number
  completos: number
  promedioMin: number
  balanceTotal: number
}

export function BranchSummary({ empleados }: Props) {
  const [open, setOpen] = useState(false)

  const sucursalMap = new Map<string, EmpleadoBalanceDia[]>()
  empleados.forEach(e => {
    const key = e.sucursal_nombre || 'Sin asignar'
    const list = sucursalMap.get(key) || []
    list.push(e)
    sucursalMap.set(key, list)
  })

  const resumenes: SucursalResumen[] = Array.from(sucursalMap.entries())
    .map(([nombre, emps]) => {
      const completos = emps.filter(e => e.estado === 'completo')
      return {
        nombre,
        total: emps.length,
        presentes: emps.filter(e => e.estado !== 'no_ficho').length,
        completos: completos.length,
        promedioMin: completos.length > 0 ? Math.round(completos.reduce((a, e) => a + e.minutos_trabajados, 0) / completos.length) : 0,
        balanceTotal: completos.reduce((a, e) => a + e.diferencia_minutos, 0),
      }
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  const fmtMin = (m: number) => `${Math.floor(Math.abs(m) / 60)}h ${Math.abs(m) % 60}m`

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Resumen por Sucursal ({resumenes.length})
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {resumenes.map(s => (
                <div key={s.nombre} className="border rounded-lg p-3 space-y-2">
                  <p className="font-medium text-sm">{s.nombre}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">{s.presentes}/{s.total} presentes</Badge>
                    <Badge className="bg-green-100 text-green-800">{s.completos} completos</Badge>
                    <Badge variant="outline">Prom: {fmtMin(s.promedioMin)}</Badge>
                    <Badge className={s.balanceTotal >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {s.balanceTotal >= 0 ? '+' : '-'}{fmtMin(Math.abs(s.balanceTotal))}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
