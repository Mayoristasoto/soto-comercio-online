import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Eye, ArrowLeft, RotateCcw } from "lucide-react"
import { DashboardEncargado } from "@/components/dashboard/DashboardEncargado"
import {
  useEncargadoAccesos,
  ICONOS_DISPONIBLES,
  type AccesoEncargado,
} from "@/hooks/useEncargadoAccesos"
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
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

export default function PreviewPanelEncargado() {
  const navigate = useNavigate()
  const { accesos, guardarAcceso, mover, restaurar } = useEncargadoAccesos()
  const [editando, setEditando] = useState<AccesoEncargado | null>(null)
  const [guardando, setGuardando] = useState(false)

  const handleGuardar = async () => {
    if (!editando) return
    setGuardando(true)
    try {
      await guardarAcceso(editando)
      setEditando(null)
      toast.success("Tarjeta actualizada para todos los encargados")
    } catch (e: any) {
      toast.error(e?.message || "No se pudo guardar")
    } finally {
      setGuardando(false)
    }
  }

  const handleMover = async (id: string, dir: -1 | 1) => {
    try {
      await mover(id, dir)
    } catch (e: any) {
      toast.error(e?.message || "No se pudo reordenar")
    }
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
            onClick={async () => {
              try {
                await restaurar()
                toast.success("Configuración restaurada")
              } catch (e: any) {
                toast.error(e?.message || "No se pudo restaurar")
              }
            }}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Restaurar textos
          </Button>
        </div>

        <Alert>
          <Eye className="h-4 w-4" />
          <AlertDescription>
            Vista previa del panel simplificado de los encargados. Los cambios de título,
            descripción, icono, orden y visibilidad se guardan en la base y los ven todos los
            encargados.
          </AlertDescription>
        </Alert>

        <div className="rounded-lg border bg-background shadow-sm">
          <DashboardEncargado
            nombre="Encargado"
            accesos={accesos}
            mostrarRutas
            modoEdicion
            onMover={handleMover}
            onEditar={(a) => setEditando({ ...a })}
          />
        </div>
      </div>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar tarjeta</DialogTitle>
            <DialogDescription>
              Estos cambios aplican a todos los encargados.
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
              <div className="space-y-2">
                <Label>Icono</Label>
                <Select
                  value={editando.icon}
                  onValueChange={(v) => setEditando({ ...editando, icon: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICONOS_DISPONIBLES.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="activo">Visible para los encargados</Label>
                <Switch
                  id="activo"
                  checked={editando.activo}
                  onCheckedChange={(v) => setEditando({ ...editando, activo: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
