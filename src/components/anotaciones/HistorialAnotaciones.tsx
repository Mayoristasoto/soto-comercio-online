import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Search, AlertTriangle, CheckCircle2, Clock, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface UserInfo {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: string
  sucursal_id: string
}

interface Anotacion {
  id: string
  empleado_id: string
  creado_por: string
  categoria: string
  fecha_anotacion: string
  titulo: string
  descripcion: string | null
  requiere_seguimiento: boolean
  seguimiento_completado: boolean
  es_critica: boolean
  empleado: {
    nombre: string
    apellido: string
    legajo: string | null
  }
  creador: {
    nombre: string
    apellido: string
  }
}

interface Props {
  userInfo: UserInfo | null
  isAdmin: boolean
  isGerente: boolean
  refreshTrigger?: number
}

const CATEGORIAS_MAP: Record<string, { label: string; color: string }> = {
  apercibimiento: { label: "Apercibimiento", color: "destructive" },
  llamado_atencion: { label: "Llamado de Atención", color: "default" },
  orden_no_acatada: { label: "Orden No Acatada", color: "destructive" },
  no_uso_uniforme: { label: "No Uso de Uniforme", color: "secondary" },
  uso_celular: { label: "Uso de Celular", color: "secondary" },
  tardanza: { label: "Tardanza", color: "default" },
  ausencia_injustificada: { label: "Ausencia Injustificada", color: "destructive" },
  actitud_positiva: { label: "Actitud Positiva", color: "outline" },
  mejora_desempeno: { label: "Mejora en Desempeño", color: "outline" },
  otro: { label: "Otro", color: "secondary" },
}

export function HistorialAnotaciones({ userInfo, isAdmin, isGerente, refreshTrigger }: Props) {
  const [anotaciones, setAnotaciones] = useState<Anotacion[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todas")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadAnotaciones()
  }, [refreshTrigger])

  const loadAnotaciones = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('empleados_anotaciones')
        .select(`
          *,
          empleado:empleados!empleados_anotaciones_empleado_id_fkey(nombre, apellido, legajo),
          creador:empleados!empleados_anotaciones_creado_por_fkey(nombre, apellido)
        `)
        .order('fecha_anotacion', { ascending: false })

      if (error) throw error

      setAnotaciones(data || [])
    } catch (error) {
      console.error('Error loading anotaciones:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las anotaciones",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('empleados_anotaciones')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Anotación eliminada correctamente"
      })
      
      loadAnotaciones()
    } catch (error) {
      console.error('Error deleting anotacion:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la anotación",
        variant: "destructive"
      })
    } finally {
      setDeleteId(null)
    }
  }

  const filteredAnotaciones = anotaciones.filter(anotacion => {
    const matchesSearch = 
      anotacion.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      anotacion.empleado.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      anotacion.empleado.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (anotacion.empleado.legajo && anotacion.empleado.legajo.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategoria = categoriaFilter === "todas" || anotacion.categoria === categoriaFilter

    return matchesSearch && matchesCategoria
  })

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Historial de Anotaciones</CardTitle>
          <CardDescription>
            {isAdmin 
              ? "Visualiza todas las anotaciones de todos los empleados"
              : "Visualiza las anotaciones que has creado"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por empleado, legajo o título..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
              <SelectTrigger className="w-full md:w-[240px]">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {Object.entries(CATEGORIAS_MAP).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filteredAnotaciones.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No se encontraron anotaciones
              </p>
            ) : (
              filteredAnotaciones.map((anotacion) => (
                <Card key={anotacion.id} className={anotacion.es_critica ? "border-destructive" : ""}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={CATEGORIAS_MAP[anotacion.categoria]?.color as any || "secondary"}>
                            {CATEGORIAS_MAP[anotacion.categoria]?.label || anotacion.categoria}
                          </Badge>
                          {anotacion.es_critica && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Crítica
                            </Badge>
                          )}
                          {anotacion.requiere_seguimiento && (
                            <Badge 
                              variant={anotacion.seguimiento_completado ? "outline" : "default"}
                              className="flex items-center gap-1"
                            >
                              {anotacion.seguimiento_completado ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {anotacion.seguimiento_completado ? "Seguimiento Completado" : "Requiere Seguimiento"}
                            </Badge>
                          )}
                        </div>
                        
                        <h4 className="font-semibold text-lg">{anotacion.titulo}</h4>
                        
                        {anotacion.descripcion && (
                          <p className="text-sm text-muted-foreground">{anotacion.descripcion}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="font-medium">
                            Empleado: {anotacion.empleado.nombre} {anotacion.empleado.apellido}
                            {anotacion.empleado.legajo && ` (${anotacion.empleado.legajo})`}
                          </span>
                          <span>•</span>
                          <span>
                            Creado por: {anotacion.creador.nombre} {anotacion.creador.apellido}
                          </span>
                          <span>•</span>
                          <span>
                            {format(new Date(anotacion.fecha_anotacion), "dd/MM/yyyy HH:mm", { locale: es })}
                          </span>
                        </div>
                      </div>

                      {(isAdmin || anotacion.creado_por === userInfo?.id) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(anotacion.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la anotación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
