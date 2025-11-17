import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Download, Eye, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function MisRecibos() {
  const [selectedRecibo, setSelectedRecibo] = useState<any>(null)
  const { toast } = useToast()

  const { data: empleado } = useQuery({
    queryKey: ["current-empleado"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")

      const { data, error } = await supabase
        .from("empleados")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (error) throw error
      return data
    }
  })

  const { data: recibos, isLoading } = useQuery({
    queryKey: ["mis-recibos", empleado?.id],
    queryFn: async () => {
      if (!empleado?.id) return []

      const { data, error } = await supabase
        .from("recibos_sueldo")
        .select(`
          *,
          liquidacion:liquidaciones_mensuales(*)
        `)
        .eq("empleado_id", empleado.id)
        .order("periodo", { ascending: false })

      if (error) throw error
      return data as any[]
    },
    enabled: !!empleado?.id
  })

  const descargarRecibo = async (recibo: any) => {
    toast({
      title: "Generando PDF",
      description: "Descargando recibo de sueldo..."
    })

    // Aquí iría la lógica para generar y descargar el PDF
    // Usando la misma función que en GenerarReciboDemo
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Mis Recibos de Sueldo</h1>
        <p className="text-muted-foreground">
          Visualiza y descarga tus recibos de sueldo mensuales
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Recibos</CardTitle>
          <CardDescription>
            Recibos de sueldo de {empleado?.nombre} {empleado?.apellido}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando recibos...</p>
          ) : recibos && recibos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Fecha Pago</TableHead>
                  <TableHead>Total Haberes</TableHead>
                  <TableHead>Deducciones</TableHead>
                  <TableHead>Neto a Cobrar</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recibos.map((recibo) => (
                  <TableRow key={recibo.id}>
                    <TableCell className="font-medium">
                      {format(new Date(recibo.periodo + "-01"), "MMMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(recibo.fecha_pago), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      ${recibo.total_haberes.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-destructive">
                      -${recibo.total_deducciones.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="font-semibold text-lg">
                      ${recibo.neto_a_cobrar.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={recibo.liquidacion?.estado === "aprobada" ? "default" : "secondary"}>
                        {recibo.liquidacion?.estado || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedRecibo(recibo)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => descargarRecibo(recibo)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay recibos disponibles</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRecibo} onOpenChange={() => setSelectedRecibo(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Detalle del Recibo - {selectedRecibo && format(new Date(selectedRecibo.periodo + "-01"), "MMMM yyyy", { locale: es })}
            </DialogTitle>
          </DialogHeader>
          {selectedRecibo && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Remunerativo</p>
                  <p className="text-lg font-semibold">
                    ${selectedRecibo.total_remunerativo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total No Remunerativo</p>
                  <p className="text-lg font-semibold">
                    ${selectedRecibo.total_no_remunerativo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Deducciones</p>
                  <p className="text-lg font-semibold text-destructive">
                    -${selectedRecibo.total_deducciones.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Neto a Cobrar</p>
                  <p className="text-2xl font-bold">
                    ${selectedRecibo.neto_a_cobrar.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              {selectedRecibo.observaciones && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Observaciones</p>
                  <p className="text-sm">{selectedRecibo.observaciones}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
