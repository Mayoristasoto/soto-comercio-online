import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Plus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"

export default function ConceptosVariables() {
  const [selectedEmpleado, setSelectedEmpleado] = useState<string>("")
  const [selectedConcepto, setSelectedConcepto] = useState<string>("")
  const [cantidad, setCantidad] = useState<string>("")
  const [monto, setMonto] = useState<string>("")
  const [periodo, setPeriodo] = useState<string>(format(new Date(), "yyyy-MM"))
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: empleados } = useQuery({
    queryKey: ["empleados-conceptos-variables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empleados")
        .select("id, nombre, apellido, legajo")
        .eq("activo", true)
        .order("apellido")
      
      if (error) throw error
      return data
    }
  })

  const { data: conceptos } = useQuery({
    queryKey: ["conceptos-variables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conceptos_liquidacion")
        .select("*")
        .eq("activo", true)
        .in("tipo", ["remunerativo", "no_remunerativo"])
        .order("nombre")
      
      if (error) throw error
      return data
    }
  })

  const { data: asignaciones } = useQuery({
    queryKey: ["conceptos-asignados", periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empleados_configuracion_payroll")
        .select(`
          *,
          empleado:empleados!inner(nombre, apellido, legajo)
        `)
        .not("otros_conceptos", "is", null)
      
      if (error) throw error
      
      // Filtrar por periodo
      return (data as any[]).filter((emp: any) => {
        const conceptos = emp.otros_conceptos || {}
        return Object.values(conceptos).some((c: any) => c.periodo === periodo)
      })
    }
  })

  const asignarConcepto = useMutation({
    mutationFn: async () => {
      if (!selectedEmpleado || !selectedConcepto) {
        throw new Error("Debe seleccionar empleado y concepto")
      }

      // Obtener configuración actual
      const { data: config } = await supabase
        .from("empleados_configuracion_payroll")
        .select("otros_conceptos")
        .eq("empleado_id", selectedEmpleado)
        .single()

      const conceptosActuales = (config?.otros_conceptos as any) || {}
      const conceptoKey = `${selectedConcepto}_${Date.now()}`
      
      conceptosActuales[conceptoKey] = {
        concepto_id: selectedConcepto,
        cantidad: parseFloat(cantidad) || 0,
        monto: parseFloat(monto) || 0,
        periodo: periodo
      }

      const { error } = await supabase
        .from("empleados_configuracion_payroll")
        .update({ otros_conceptos: conceptosActuales })
        .eq("empleado_id", selectedEmpleado)

      if (error) throw error
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Concepto asignado correctamente"
      })
      queryClient.invalidateQueries({ queryKey: ["conceptos-asignados"] })
      setSelectedEmpleado("")
      setSelectedConcepto("")
      setCantidad("")
      setMonto("")
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  const eliminarConcepto = useMutation({
    mutationFn: async ({ empleadoId, conceptoKey }: { empleadoId: string, conceptoKey: string }) => {
      const { data: config } = await supabase
        .from("empleados_configuracion_payroll")
        .select("otros_conceptos")
        .eq("empleado_id", empleadoId)
        .single()

      const conceptosActuales = (config?.otros_conceptos as any) || {}
      delete conceptosActuales[conceptoKey]

      const { error } = await supabase
        .from("empleados_configuracion_payroll")
        .update({ otros_conceptos: conceptosActuales })
        .eq("empleado_id", empleadoId)

      if (error) throw error
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Concepto eliminado correctamente"
      })
      queryClient.invalidateQueries({ queryKey: ["conceptos-asignados"] })
    }
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Asignar Conceptos Variables</CardTitle>
          <CardDescription>
            Gestiona horas extras, bonos y otros conceptos mensuales por empleado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Empleado</Label>
              <Select value={selectedEmpleado} onValueChange={setSelectedEmpleado}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {empleados?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.apellido}, {emp.nombre} ({emp.legajo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Concepto</Label>
              <Select value={selectedConcepto} onValueChange={setSelectedConcepto}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar concepto" />
                </SelectTrigger>
                <SelectContent>
                  {conceptos?.map((concepto) => (
                    <SelectItem key={concepto.id} value={concepto.id}>
                      {concepto.nombre} ({concepto.tipo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Cantidad/Horas</Label>
              <Input
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="0"
                step="0.01"
              />
            </div>

            <div>
              <Label>Monto Fijo (opcional)</Label>
              <Input
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0"
                step="0.01"
              />
            </div>

            <div>
              <Label>Periodo</Label>
              <Input
                type="month"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={() => asignarConcepto.mutate()}
            disabled={!selectedEmpleado || !selectedConcepto || asignarConcepto.isPending}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Asignar Concepto
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conceptos Asignados - {periodo}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {asignaciones?.map((emp: any) => {
                const conceptos = emp.otros_conceptos || {}
                return Object.entries(conceptos).map(([key, value]: [string, any]) => {
                  if (value.periodo !== periodo) return null
                  
                  const concepto = conceptos?.find((c: any) => c.id === value.concepto_id)
                  
                  return (
                    <TableRow key={`${emp.empleado_id}_${key}`}>
                      <TableCell>
                        {emp.empleado?.apellido}, {emp.empleado?.nombre}
                      </TableCell>
                      <TableCell>{concepto?.nombre || value.concepto_id}</TableCell>
                      <TableCell>{value.cantidad}</TableCell>
                      <TableCell>${value.monto?.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => eliminarConcepto.mutate({
                            empleadoId: emp.empleado_id,
                            conceptoKey: key
                          })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
