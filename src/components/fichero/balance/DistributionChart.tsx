import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { EmpleadoBalanceDia } from "./types"

interface Props {
  empleados: EmpleadoBalanceDia[]
}

export function DistributionChart({ empleados }: Props) {
  const completos = empleados.filter(e => e.estado === 'completo').length
  const sinSalida = empleados.filter(e => e.estado === 'sin_salida').length
  const noFicho = empleados.filter(e => e.estado === 'no_ficho').length
  const otros = empleados.filter(e => e.estado === 'solo_pausa' || e.estado === 'sin_entrada').length

  const statusData = [
    { name: 'Completo', value: completos, fill: 'hsl(142, 71%, 45%)' },
    { name: 'Sin salida', value: sinSalida, fill: 'hsl(25, 95%, 53%)' },
    { name: 'No fichó', value: noFicho, fill: 'hsl(215, 20%, 65%)' },
    ...(otros > 0 ? [{ name: 'Otros', value: otros, fill: 'hsl(270, 50%, 60%)' }] : []),
  ]

  const completosArr = empleados.filter(e => e.estado === 'completo')
  const topExtras = [...completosArr]
    .filter(e => e.diferencia_minutos > 0)
    .sort((a, b) => b.diferencia_minutos - a.diferencia_minutos)
    .slice(0, 5)
    .map(e => ({
      name: `${e.apellido}, ${e.nombre.charAt(0)}.`,
      minutos: e.diferencia_minutos,
    }))

  const topDeficit = [...completosArr]
    .filter(e => e.diferencia_minutos < 0)
    .sort((a, b) => a.diferencia_minutos - b.diferencia_minutos)
    .slice(0, 5)
    .map(e => ({
      name: `${e.apellido}, ${e.nombre.charAt(0)}.`,
      minutos: Math.abs(e.diferencia_minutos),
    }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Distribución por estado</CardTitle>
        </CardHeader>
        <CardContent className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => [v, 'Empleados']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-green-600">Top horas extra</CardTitle>
        </CardHeader>
        <CardContent className="h-[180px]">
          {topExtras.length === 0 ? (
            <p className="text-sm text-muted-foreground pt-4">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topExtras} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${Math.floor(v/60)}h ${v%60}m`, 'Extra']} />
                <Bar dataKey="minutos" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-red-600">Top déficit</CardTitle>
        </CardHeader>
        <CardContent className="h-[180px]">
          {topDeficit.length === 0 ? (
            <p className="text-sm text-muted-foreground pt-4">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDeficit} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${Math.floor(v/60)}h ${v%60}m`, 'Déficit']} />
                <Bar dataKey="minutos" fill="hsl(0, 84%, 60%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
