import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Download, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

export default function ExportacionBancaria() {
  const [selectedLiquidacion, setSelectedLiquidacion] = useState<string>("")
  const { toast } = useToast()

  const { data: liquidaciones } = useQuery({
    queryKey: ["liquidaciones-exportacion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liquidaciones_mensuales")
        .select("*")
        .eq("estado", "aprobada")
        .order("periodo", { ascending: false })
      
      if (error) throw error
      return data
    }
  })

  const { data: recibos, isLoading } = useQuery({
    queryKey: ["recibos-exportacion", selectedLiquidacion],
    queryFn: async () => {
      if (!selectedLiquidacion) return []
      
      const { data, error } = await supabase
        .from("recibos_sueldo")
        .select(`
          *,
          empleado:empleados!inner(
            nombre,
            apellido,
            legajo
          ),
          config:empleados_configuracion_payroll!inner(
            banco,
            tipo_cuenta,
            cbu
          )
        `)
        .eq("liquidacion_id", selectedLiquidacion)
      
      if (error) throw error
      return data as any[]
    },
    enabled: !!selectedLiquidacion
  })

  const generarArchivoTXT = () => {
    if (!recibos || recibos.length === 0) {
      toast({
        title: "Error",
        description: "No hay recibos para exportar",
        variant: "destructive"
      })
      return
    }

    let contenido = ""
    
    // Formato estándar para bancos argentinos
    recibos.forEach((recibo: any) => {
      const cbu = recibo.config?.cbu || "0".repeat(22)
      const monto = Math.round(recibo.neto_a_cobrar * 100).toString().padStart(15, "0")
      const legajo = (recibo.empleado?.legajo || "").padEnd(20, " ")
      const nombre = `${recibo.empleado?.nombre} ${recibo.empleado?.apellido}`.padEnd(50, " ")
      
      // Formato: CBU(22) + MONTO(15) + LEGAJO(20) + NOMBRE(50)
      contenido += `${cbu}${monto}${legajo}${nombre}\n`
    })

    // Crear archivo y descargar
    const blob = new Blob([contenido], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `exportacion_bancaria_${selectedLiquidacion}.txt`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Éxito",
      description: "Archivo generado correctamente"
    })
  }

  const generarArchivoCSV = () => {
    if (!recibos || recibos.length === 0) {
      toast({
        title: "Error",
        description: "No hay recibos para exportar",
        variant: "destructive"
      })
      return
    }

    let contenido = "CBU,Monto,Legajo,Nombre,Apellido,Banco,Tipo Cuenta\n"
    
    recibos.forEach((recibo: any) => {
      contenido += `${recibo.config?.cbu || ""},${recibo.neto_a_cobrar},${recibo.empleado?.legajo || ""},${recibo.empleado?.nombre || ""},${recibo.empleado?.apellido || ""},${recibo.config?.banco || ""},${recibo.config?.tipo_cuenta || ""}\n`
    })

    const blob = new Blob([contenido], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `exportacion_bancaria_${selectedLiquidacion}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Éxito",
      description: "Archivo CSV generado correctamente"
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Exportación Bancaria</CardTitle>
          <CardDescription>
            Genera archivos para carga de sueldos en entidades bancarias
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Liquidación a Exportar
            </label>
            <Select value={selectedLiquidacion} onValueChange={setSelectedLiquidacion}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar liquidación aprobada" />
              </SelectTrigger>
              <SelectContent>
                {liquidaciones?.map((liq: any) => (
                  <SelectItem key={liq.id} value={liq.id}>
                    {liq.periodo} - {liq.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {recibos && recibos.length > 0 && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm">
                <strong>Total empleados:</strong> {recibos.length}
              </p>
              <p className="text-sm">
                <strong>Monto total:</strong> ${recibos.reduce((sum: number, r: any) => sum + r.neto_a_cobrar, 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={generarArchivoTXT}
              disabled={!selectedLiquidacion || isLoading}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              Exportar TXT (Banco)
            </Button>
            <Button
              onClick={generarArchivoCSV}
              disabled={!selectedLiquidacion || isLoading}
              variant="outline"
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
