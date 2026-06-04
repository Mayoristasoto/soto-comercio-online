import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Save, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  GrupoEmpleados,
  SeleccionEmpleados,
  listarGrupos,
  resolverGrupo,
  guardarGrupo,
  eliminarGrupo,
} from "@/lib/gruposEmpleados";

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  legajo: string | null;
  activo: boolean;
}

interface Props {
  /** Selección actual. null = "todos" (ningún filtro). */
  value: SeleccionEmpleados | null;
  onChange: (v: SeleccionEmpleados | null) => void;
  /** Módulo sugerido — los grupos con este módulo aparecen primero. */
  modulo?: string;
  /** Lista de empleados disponibles. Si no se pasa, se cargan los activos. */
  empleados?: Empleado[];
  label?: string;
  /** Texto del placeholder cuando no hay selección. Default: "— Todos —". */
  placeholderTodos?: string;
  className?: string;
}

const TODOS = "__todos__";

export function SelectorGrupoCompacto({
  value,
  onChange,
  modulo,
  empleados: empleadosProp,
  label = "Lista guardada",
  placeholderTodos = "— Todos —",
  className,
}: Props) {
  const [grupos, setGrupos] = useState<GrupoEmpleados[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>(empleadosProp || []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [search, setSearch] = useState("");

  const seleccionados = value?.empleadoIds || [];
  const grupoIdActual = value?.tipo === "grupo" ? (value as any).grupoId || "" : "";

  const loadGrupos = async () => {
    try {
      const g = await listarGrupos(modulo);
      setGrupos(g);
    } catch {
      setGrupos([]);
    }
  };

  useEffect(() => { loadGrupos(); /* eslint-disable-next-line */ }, [modulo]);

  useEffect(() => {
    if (empleadosProp) { setEmpleados(empleadosProp); return; }
    (async () => {
      const { data } = await supabase
        .from("empleados")
        .select("id,nombre,apellido,legajo,activo")
        .eq("activo", true)
        .order("apellido");
      setEmpleados((data || []) as Empleado[]);
    })();
  }, [empleadosProp]);

  const selectValue = grupoIdActual || (seleccionados.length ? "" : TODOS);

  const aplicarGrupo = async (id: string) => {
    if (id === TODOS) { onChange(null); return; }
    if (!id) return;
    const ids = await resolverGrupo(id);
    onChange({ tipo: "grupo", grupoId: id, empleadoIds: ids });
  };

  const toggleEmp = (id: string) => {
    const next = seleccionados.includes(id)
      ? seleccionados.filter(x => x !== id)
      : [...seleccionados, id];
    onChange(next.length ? { tipo: "multiple", empleadoIds: next } : null);
  };

  const guardar = async () => {
    if (!nuevoNombre.trim()) { toast.error("Poné un nombre"); return; }
    if (!seleccionados.length) { toast.error("Seleccioná al menos un empleado"); return; }
    try {
      const g = await guardarGrupo({
        nombre: nuevoNombre.trim(),
        tipo: "manual",
        empleado_ids: seleccionados,
        modulos_sugeridos: modulo ? [modulo] : [],
        compartido: true,
      });
      toast.success("Grupo guardado");
      setGrupos(prev => [g, ...prev]);
      onChange({ tipo: "grupo", grupoId: g.id, empleadoIds: seleccionados });
      setNuevoNombre("");
      setSaveOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    }
  };

  const eliminar = async () => {
    if (!grupoIdActual) return;
    if (!confirm("¿Eliminar este grupo? No afecta a los empleados, solo borra la lista guardada.")) return;
    try {
      await eliminarGrupo(grupoIdActual);
      toast.success("Grupo eliminado");
      onChange(null);
      loadGrupos();
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar");
    }
  };

  const filtered = empleados.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    return e.nombre.toLowerCase().includes(s)
      || e.apellido.toLowerCase().includes(s)
      || (e.legajo || "").includes(s);
  });

  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="flex gap-1">
        <Select value={selectValue} onValueChange={aplicarGrupo}>
          <SelectTrigger><SelectValue placeholder={placeholderTodos} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>{placeholderTodos}</SelectItem>
            {grupos.map(g => (
              <SelectItem key={g.id} value={g.id}>
                {g.nombre}
                {modulo && g.modulos_sugeridos?.includes(modulo) ? " ⭐" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="icon" onClick={() => setPickerOpen(true)} title="Seleccionar empleados">
          <Users className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={() => setSaveOpen(true)} title="Guardar como nuevo grupo" disabled={!seleccionados.length}>
          <Save className="h-4 w-4" />
        </Button>
        {grupoIdActual && (
          <Button type="button" variant="outline" size="icon" onClick={eliminar} title="Eliminar grupo">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      {seleccionados.length > 0 && (
        <Badge variant="secondary" className="mt-1">{seleccionados.length} empleados</Badge>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Seleccionar empleados</DialogTitle></DialogHeader>
          <Input placeholder="Buscar por nombre o legajo..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="flex gap-2 text-xs">
            <Button size="sm" variant="outline" onClick={() => onChange({ tipo: "multiple", empleadoIds: filtered.map(e => e.id) })}>
              Seleccionar todos los visibles
            </Button>
            <Button size="sm" variant="outline" onClick={() => onChange(null)}>Limpiar</Button>
          </div>
          <div className="max-h-96 overflow-auto border rounded-md divide-y">
            {filtered.map(e => (
              <label key={e.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer">
                <input type="checkbox" checked={seleccionados.includes(e.id)} onChange={() => toggleEmp(e.id)} />
                <span>{e.apellido}, {e.nombre}</span>
                {e.legajo && <span className="text-xs text-muted-foreground">#{e.legajo}</span>}
                {!e.activo && <Badge variant="outline" className="ml-auto">inactivo</Badge>}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setPickerOpen(false)}>Listo ({seleccionados.length})</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Guardar como grupo</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Ej. Activos liquidación junio" />
            <p className="text-xs text-muted-foreground">
              Se guardarán {seleccionados.length} empleados. Quedará disponible para todos los módulos
              {modulo ? <> (sugerido para <strong>{modulo}</strong>).</> : "."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancelar</Button>
            <Button onClick={guardar}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
