import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Calculator, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function CalculoSAC() {
  const [periodo, setPeriodo] = useState<string>("1") // 1 o 2 (semestres)
  const [anio, setAnio] = useState<string>(new Date().getFullYear().toString())
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: empleados, isLoading } = useQuery({
    queryKey: ["empleados-sac"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empleados")
        .select(`
          id,
          nombre,
          apellido,
          legajo,
          fecha_ingreso,
          config:empleados_configuracion_payroll!inner(*)
        `)
        .eq("activo", true)
      
      if (error) throw error
      return data as any[]
    }
  })

  // Calcular SAC para todos los empleados
  const calcularSAC = () => {
    if (!empleados) return []

    const mesInicio = periodo === "1" ? 0 : 6
    const mesFin = periodo === "1" ? 5 : 11

    return empleados.map((emp: any) => {
      // Obtener mejor sueldo del semestre
      // Aquí deberíamos consultar los recibos del semestre
      // Por ahora usamos el salario configurado
      const mejorSueldo = 450000 // Placeholder - debería venir de la DB

      // Calcular meses trabajados en el semestre
      const fechaIngreso = new Date(emp.fecha_ingreso)
      const inicioSemestre = new Date(parseInt(anio), mesInicio, 1)
      const finSemestre = new Date(parseInt(anio), mesFin, 30)
      
      let mesesTrabajados = 6
      if (fechaIngreso > inicioSemestre) {
        const diasTrabajados = Math.floor((finSemestre.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24))
        mesesTrabajados = Math.min(6, Math.ceil(diasTrabajados / 30))
      }

      const montoSAC = (mejorSueldo / 12) * mesesTrabajados

      return {
        ...emp,
        mejorSueldo,
        mesesTrabajados,
        montoSAC
      }
    })
  }

  const empleadosSAC = calcularSAC()

  const generarLiquidacionSAC = useMutation({
    mutationFn: async () => {
      const descripcion = `SAC ${periodo}° Semestre ${anio}`
      const mes = periodo === "1" ? 6 : 12
      
      // Crear liquidación
      const { data: liquidacion, error: errorLiq } = await supabase
        .from("liquidaciones_mensuales")
        .insert({
          descripcion,
          estado: "borrador",
          fecha_liquidacion: new Date(parseInt(anio), mes - 1, 30).toISOString(),
          fecha_pago: new Date(parseInt(anio), mes - 1, 30).toISOString(),
          total_remunerativo: empleadosSAC.reduce((sum, e) => sum + e.montoSAC, 0),
          total_no_remunerativo: 0,
          total_deducciones: 0,
          total_neto: empleadosSAC.reduce((sum, e) => sum + e.montoSAC, 0)
        } as any)
        .select()
        .single()

      if (errorLiq) throw errorLiq

      // Crear recibos para cada empleado
      const recibos = empleadosSAC.map((emp) => ({
        liquidacion_id: liquidacion.id,
        empleado_id: emp.id,
        periodo: `${anio}-${periodo === "1" ? "06" : "12"}`,
        fecha_pago: new Date(parseInt(anio), periodo === "1" ? 5 : 11, 30).toISOString(),
        total_remunerativo: emp.montoSAC,
        total_no_remunerativo: 0,
        total_haberes: emp.montoSAC,
        total_deducciones: 0,
        neto_a_cobrar: emp.montoSAC,
        observaciones: `SAC ${periodo}° Semestre ${anio} - ${emp.mesesTrabajados} meses trabajados`
      }))

      const { error: errorRecibos } = await supabase
        .from("recibos_sueldo")
        .insert(recibos as any)

      if (errorRecibos) throw errorRecibos

      return liquidacion
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Liquidación de SAC creada correctamente"
      })
      queryClient.invalidateQueries({ queryKey: ["liquidaciones"] })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cálculo de SAC (Aguinaldo)</CardTitle>
          <CardDescription>
            Genera la liquidación del Sueldo Anual Complementario
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Año</label>
              <Select value={anio} onValueChange={setAnio}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Semestre</label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1° Semestre (Junio)</SelectItem>
                  <SelectItem value="2">2° Semestre (Diciembre)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm">
              <strong>Total empleados:</strong> {empleadosSAC.length}
            </p>
            <p className="text-sm">
              <strong>Monto total SAC:</strong> ${empleadosSAC.reduce((sum, e) => sum + e.montoSAC, 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <Button
            onClick={() => generarLiquidacionSAC.mutate()}
            disabled={isLoading || generarLiquidacionSAC.isPending}
            className="w-full"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Generar Liquidación de SAC
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalle por Empleado</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Legajo</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Mejor Sueldo</TableHead>
                <TableHead>Meses</TableHead>
                <TableHead>Monto SAC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empleadosSAC.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>{emp.legajo}</TableCell>
                  <TableCell>{emp.apellido}, {emp.nombre}</TableCell>
                  <TableCell>${emp.mejorSueldo.toLocaleString("es-AR")}</TableCell>
                  <TableCell>{emp.mesesTrabajados}</TableCell>
                  <TableCell className="font-semibold">
                    ${emp.montoSAC.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
