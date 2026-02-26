import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { Plus, Edit, Trash2, Bell, Printer, Search, X } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Novedad {
  id: string
  titulo: string
  contenido: string
  fecha_inicio: string
  fecha_fin: string
  activa: boolean
  asignacion_tipo: string
  roles_asignados: string[]
  empleados_asignados: string[]
  imprimible: boolean
  created_at: string
}

interface Empleado {
  id: string
  nombre: string
  apellido: string
  puesto: string | null
}

const ROLES_DISPONIBLES = [
  { value: "cajero", label: "Cajero" },
  { value: "repositor", label: "Repositor" },
  { value: "encargado", label: "Encargado" },
  { value: "gerente_sucursal", label: "Gerente de Sucursal" },
  { value: "lider_grupo", label: "Líder de Grupo" },
  { value: "vendedor", label: "Vendedor" },
  { value: "administrativo", label: "Administrativo" },
]

export default function NovedadesAlert() {
  const [novedades, setNovedades] = useState<Novedad[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [searchEmpleado, setSearchEmpleado] = useState("")

  const [form, setForm] = useState({
    titulo: "",
    contenido: "",
    fecha_inicio: new Date().toISOString().slice(0, 16),
    fecha_fin: "",
    activa: true,
    asignacion_tipo: "todos",
    roles_asignados: [] as string[],
    empleados_asignados: [] as string[],
    imprimible: false,
  })

  useEffect(() => {
    fetchNovedades()
    fetchEmpleados()
  }, [])

  const fetchNovedades = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("novedades_alertas")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) {
      toast.error("Error cargando novedades")
    } else {
      setNovedades((data as any[]) || [])
    }
    setLoading(false)
  }

  const fetchEmpleados = async () => {
    const { data } = await supabase
      .from("empleados")
      .select("id, nombre, apellido, puesto")
      .eq("activo", true)
      .order("apellido")
    setEmpleados((data as Empleado[]) || [])
  }

  const resetForm = () => {
    setForm({
      titulo: "",
      contenido: "",
      fecha_inicio: new Date().toISOString().slice(0, 16),
      fecha_fin: "",
      activa: true,
      asignacion_tipo: "todos",
      roles_asignados: [],
      empleados_asignados: [],
      imprimible: false,
    })
    setEditingId(null)
    setSearchEmpleado("")
  }

  const handleEdit = (novedad: Novedad) => {
    setForm({
      titulo: novedad.titulo,
      contenido: novedad.contenido,
      fecha_inicio: novedad.fecha_inicio.slice(0, 16),
      fecha_fin: novedad.fecha_fin.slice(0, 16),
      activa: novedad.activa,
      asignacion_tipo: novedad.asignacion_tipo,
      roles_asignados: novedad.roles_asignados || [],
      empleados_asignados: novedad.empleados_asignados || [],
      imprimible: novedad.imprimible,
    })
    setEditingId(novedad.id)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.titulo || !form.contenido || !form.fecha_fin) {
      toast.error("Complete todos los campos obligatorios")
      return
    }

    const payload = {
      titulo: form.titulo,
      contenido: form.contenido,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      activa: form.activa,
      asignacion_tipo: form.asignacion_tipo,
      roles_asignados: form.asignacion_tipo === "roles" ? form.roles_asignados : [],
      empleados_asignados: form.asignacion_tipo === "empleados" ? form.empleados_asignados : [],
      imprimible: form.imprimible,
    }

    let error
    if (editingId) {
      ;({ error } = await supabase.from("novedades_alertas").update(payload).eq("id", editingId))
    } else {
      ;({ error } = await supabase.from("novedades_alertas").insert(payload))
    }

    if (error) {
      toast.error("Error guardando novedad: " + error.message)
    } else {
      toast.success(editingId ? "Novedad actualizada" : "Novedad creada")
      setDialogOpen(false)
      resetForm()
      fetchNovedades()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta novedad?")) return
    const { error } = await supabase.from("novedades_alertas").delete().eq("id", id)
    if (error) toast.error("Error eliminando")
    else {
      toast.success("Novedad eliminada")
      fetchNovedades()
    }
  }

  const handleToggleActiva = async (id: string, activa: boolean) => {
    await supabase.from("novedades_alertas").update({ activa }).eq("id", id)
    fetchNovedades()
  }

  const toggleRole = (role: string) => {
    setForm(prev => ({
      ...prev,
      roles_asignados: prev.roles_asignados.includes(role)
        ? prev.roles_asignados.filter(r => r !== role)
        : [...prev.roles_asignados, role],
    }))
  }

  const toggleEmpleado = (empId: string) => {
    setForm(prev => ({
      ...prev,
      empleados_asignados: prev.empleados_asignados.includes(empId)
        ? prev.empleados_asignados.filter(e => e !== empId)
        : [...prev.empleados_asignados, empId],
    }))
  }

  const filteredEmpleados = empleados.filter(e => {
    const q = searchEmpleado.toLowerCase()
    if (!q) return true
    return `${e.nombre} ${e.apellido}`.toLowerCase().includes(q)
  })

  const isActive = (n: Novedad) => n.activa && new Date(n.fecha_fin) > new Date()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Novedades y Alertas
          </h1>
          <p className="text-muted-foreground text-sm">
            Configura mensajes que aparecerán a los empleados al hacer check-in
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nueva Novedad</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Novedad" : "Nueva Novedad"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Título *</Label>
                <Input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ej: Actualización de precios cigarrillos" />
              </div>
              <div>
                <Label>Contenido *</Label>
                <Textarea value={form.contenido} onChange={e => setForm(p => ({ ...p, contenido: e.target.value }))} placeholder="Detalle de la novedad..." rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha Inicio</Label>
                  <Input type="datetime-local" value={form.fecha_inicio} onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))} />
                </div>
                <div>
                  <Label>Fecha Fin *</Label>
                  <Input type="datetime-local" value={form.fecha_fin} onChange={e => setForm(p => ({ ...p, fecha_fin: e.target.value }))} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={form.imprimible} onCheckedChange={v => setForm(p => ({ ...p, imprimible: v }))} />
                <Label className="flex items-center gap-1"><Printer className="h-4 w-4" /> Imprimible</Label>
              </div>

              <div>
                <Label className="mb-2 block">Asignar a</Label>
                <RadioGroup value={form.asignacion_tipo} onValueChange={v => setForm(p => ({ ...p, asignacion_tipo: v }))}>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="todos" id="todos" />
                    <Label htmlFor="todos">Todos los empleados</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="roles" id="roles" />
                    <Label htmlFor="roles">Por Rol/Puesto</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="empleados" id="empleados" />
                    <Label htmlFor="empleados">Empleados específicos</Label>
                  </div>
                </RadioGroup>
              </div>

              {form.asignacion_tipo === "roles" && (
                <div className="border rounded-lg p-3 space-y-2">
                  <Label>Roles asignados</Label>
                  <div className="flex flex-wrap gap-2">
                    {ROLES_DISPONIBLES.map(r => (
                      <Badge
                        key={r.value}
                        variant={form.roles_asignados.includes(r.value) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleRole(r.value)}
                      >
                        {r.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {form.asignacion_tipo === "empleados" && (
                <div className="border rounded-lg p-3 space-y-2">
                  <Label>Empleados asignados</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar empleado..."
                      className="pl-8"
                      value={searchEmpleado}
                      onChange={e => setSearchEmpleado(e.target.value)}
                    />
                  </div>
                  {form.empleados_asignados.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {form.empleados_asignados.map(empId => {
                        const emp = empleados.find(e => e.id === empId)
                        return emp ? (
                          <Badge key={empId} variant="default" className="cursor-pointer" onClick={() => toggleEmpleado(empId)}>
                            {emp.apellido}, {emp.nombre} <X className="h-3 w-3 ml-1" />
                          </Badge>
                        ) : null
                      })}
                    </div>
                  )}
                  <ScrollArea className="max-h-40">
                    <ul className="space-y-1">
                      {filteredEmpleados.filter(e => !form.empleados_asignados.includes(e.id)).map(emp => (
                        <li key={emp.id} className="flex items-center justify-between text-sm p-1 hover:bg-accent rounded cursor-pointer" onClick={() => toggleEmpleado(emp.id)}>
                          <span>{emp.apellido}, {emp.nombre}</span>
                          <Badge variant="outline" className="text-xs">{emp.puesto || "—"}</Badge>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm() }}>Cancelar</Button>
                <Button onClick={handleSave}>{editingId ? "Guardar cambios" : "Crear Novedad"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novedades configuradas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Cargando...</p>
          ) : novedades.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay novedades configuradas</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Asignación</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Imprimible</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {novedades.map(n => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.titulo}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(n.fecha_inicio), "dd/MM/yy HH:mm", { locale: es })} — {format(new Date(n.fecha_fin), "dd/MM/yy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {n.asignacion_tipo === "todos" ? "Todos" : n.asignacion_tipo === "roles" ? `Roles (${n.roles_asignados?.length || 0})` : `Empleados (${n.empleados_asignados?.length || 0})`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch checked={n.activa} onCheckedChange={v => handleToggleActiva(n.id, v)} />
                      <Badge variant={isActive(n) ? "default" : "secondary"} className="ml-2">
                        {isActive(n) ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell>{n.imprimible ? <Printer className="h-4 w-4 text-primary" /> : "—"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(n)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(n.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
