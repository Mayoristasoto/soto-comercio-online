import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { EmpleadoBalanceDia } from "./types"

interface Props {
  empleados: EmpleadoBalanceDia[]
  totalActivos: number
}

export function ExecutiveSummary({ empleados, totalActivos }: Props) {
  const conFichaje = empleados.filter(e => e.estado !== 'no_ficho').length
  const completos = empleados.filter(e => e.estado === 'completo')
  const sinSalida = empleados.filter(e => e.estado === 'sin_salida').length
  const presentismo = totalActivos > 0 ? Math.round((conFichaje / totalActivos) * 100) : 0
  const jornadaCompletaPct = totalActivos > 0 ? Math.round((completos.length / totalActivos) * 100) : 0

  const totalMinTrabajados = completos.reduce((a, e) => a + e.minutos_trabajados, 0)
  const promedioMin = completos.length > 0 ? Math.round(totalMinTrabajados / completos.length) : 0
  const balanceGlobal = completos.reduce((a, e) => a + e.diferencia_minutos, 0)

  const fmtMin = (m: number) => {
    const h = Math.floor(Math.abs(m) / 60)
    const mins = Math.abs(m) % 60
    return `${h}h ${mins}m`
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Presentismo</span>
          </div>
          <p className="text-2xl font-bold">{conFichaje}<span className="text-sm font-normal text-muted-foreground">/{totalActivos}</span></p>
          <Progress value={presentismo} className="h-1.5 mt-2" />
          <p className="text-xs text-muted-foreground mt-1">{presentismo}%</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Jornadas completas</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{completos.length}</p>
          <Progress value={jornadaCompletaPct} className="h-1.5 mt-2 [&>div]:bg-green-500" />
          <p className="text-xs text-muted-foreground mt-1">{jornadaCompletaPct}%</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-muted-foreground">Sin salida</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{sinSalida}</p>
          <p className="text-xs text-muted-foreground mt-3">Requieren atención</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Horas totales</span>
          </div>
          <p className="text-2xl font-bold">{fmtMin(totalMinTrabajados)}</p>
          <p className="text-xs text-muted-foreground mt-3">Equipo completo</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Promedio</span>
          </div>
          <p className="text-2xl font-bold">{fmtMin(promedioMin)}</p>
          <p className="text-xs text-muted-foreground mt-3">Por empleado</p>
        </CardContent>
      </Card>

      <Card className={balanceGlobal >= 0 ? "border-green-200 bg-green-50/50 dark:bg-green-950/20" : "border-red-200 bg-red-50/50 dark:bg-red-950/20"}>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 mb-1">
            {balanceGlobal >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span className="text-xs text-muted-foreground">Balance global</span>
          </div>
          <p className={`text-2xl font-bold ${balanceGlobal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {balanceGlobal >= 0 ? '+' : '-'}{fmtMin(Math.abs(balanceGlobal))}
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            {balanceGlobal >= 0 ? 'Horas extra' : 'Déficit'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
