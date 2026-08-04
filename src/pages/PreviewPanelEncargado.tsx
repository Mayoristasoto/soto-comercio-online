import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Eye, ArrowLeft, RotateCcw } from "lucide-react"
import { DashboardEncargado } from "@/components/dashboard/DashboardEncargado"
import { useEncargadoAccesos, type AccesoEncargado } from "@/hooks/useEncargadoAccesos"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

export default function PreviewPanelEncargado() {
  const navigate = useNavigate()
  const { accesos, guardar, restaurar } = useEncargadoAccesos()
  const [editando, setEditando] = useState<AccesoEncargado | null>(null)

  const handleGuardar = () => {
    if (!editando) return
    guardar(accesos.map((a) => (a.id === editando.id ? editando : a)))
    setEditando(null)
    toast.success("Tarjeta actualizada")
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              restaurar()
              toast.success("Configuración restaurada")
            }}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Restaurar textos
          </Button>
        </div>

        <Alert>
          <Eye className="h-4 w-4" />
          <AlertDescription>
            Vista previa del panel simplificado que ven los encargados de sucursal. Usá el lápiz de
            cada tarjeta para editar título, descripción y ruta de destino.
          </AlertDescription>
        </Alert>

        <div className="rounded-lg border bg-background shadow-sm">
          <DashboardEncargado
            nombre="Encargado"
            accesos={accesos}
            mostrarRutas
            onEditar={(a) => setEditando({ ...a })}
          />
        </div>
      </div>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar tarjeta</DialogTitle>
            <DialogDescription>
              Cambiá el texto y la ruta a la que lleva esta tarjeta del panel de encargados.
            </DialogDescription>
          </DialogHeader>
          {editando && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={editando.titulo}
                  onChange={(e) => setEditando({ ...editando, titulo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={editando.descripcion}
                  onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">Ruta de destino</Label>
                <Input
                  id="url"
                  value={editando.url}
                  onChange={(e) => setEditando({ ...editando, url: e.target.value })}
                  placeholder="/rrhh/vacaciones"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
