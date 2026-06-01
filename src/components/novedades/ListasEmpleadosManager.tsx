import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Save, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

interface Empleado { id: string; nombre: string; apellido: string; legajo: string | null; activo: boolean; }
interface Lista { id: string; nombre: string; empleado_ids: string[]; }

interface Props {
  empleados: Empleado[];
  selectedIds: string[];
  onSelectedChange: (ids: string[]) => void;
}

export function ListasEmpleadosManager({ empleados, selectedIds, onSelectedChange }: Props) {
  const [listas, setListas] = useState<Lista[]>([]);
  const [listaSel, setListaSel] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("liquidacion_listas_empleados")
      .select("id,nombre,empleado_ids")
      .order("nombre");
    setListas((data || []) as Lista[]);
  };
  useEffect(() => { load(); }, []);

  const aplicarLista = (id: string) => {
    setListaSel(id);
    if (id === "todos") { onSelectedChange([]); return; }
    const l = listas.find(x => x.id === id);
    if (l) onSelectedChange(l.empleado_ids);
  };

  const guardar = async () => {
    if (!nuevoNombre.trim()) { toast.error("Poné un nombre"); return; }
    if (!selectedIds.length) { toast.error("Seleccioná al menos un empleado"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("liquidacion_listas_empleados")
      .insert({ nombre: nuevoNombre.trim(), empleado_ids: selectedIds, created_by: user?.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Lista guardada");
    setNuevoNombre(""); setSaveOpen(false); load();
  };

  const eliminar = async () => {
    if (!listaSel || listaSel === "todos") return;
    if (!confirm("¿Eliminar esta lista?")) return;
    const { error } = await supabase.from("liquidacion_listas_empleados").delete().eq("id", listaSel);
    if (error) { toast.error(error.message); return; }
    toast.success("Eliminada");
    setListaSel(""); onSelectedChange([]); load();
  };

  const toggleEmp = (id: string) => {
    onSelectedChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  };

  const filtered = empleados.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    return e.nombre.toLowerCase().includes(s) || e.apellido.toLowerCase().includes(s) || (e.legajo || "").includes(s);
  });

  return (
    <>
      <div className="md:col-span-2">
        <Label>Lista guardada</Label>
        <div className="flex gap-1">
          <Select value={listaSel} onValueChange={aplicarLista}>
            <SelectTrigger><SelectValue placeholder="— Ninguna —" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los empleados</SelectItem>
              {listas.map(l => <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="icon" onClick={() => setPickerOpen(true)} title="Seleccionar empleados">
            <Users className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={() => setSaveOpen(true)} title="Guardar como nueva lista" disabled={!selectedIds.length}>
            <Save className="h-4 w-4" />
          </Button>
          {listaSel && listaSel !== "todos" && (
            <Button type="button" variant="outline" size="icon" onClick={eliminar} title="Eliminar lista">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        {selectedIds.length > 0 && (
          <Badge variant="secondary" className="mt-1">{selectedIds.length} empleados</Badge>
        )}
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Seleccionar empleados</DialogTitle></DialogHeader>
          <Input placeholder="Buscar por nombre o legajo..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="flex gap-2 text-xs">
            <Button size="sm" variant="outline" onClick={() => onSelectedChange(filtered.map(e => e.id))}>Seleccionar todos los visibles</Button>
            <Button size="sm" variant="outline" onClick={() => onSelectedChange([])}>Limpiar</Button>
          </div>
          <div className="max-h-96 overflow-auto border rounded-md divide-y">
            {filtered.map(e => (
              <label key={e.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer">
                <input type="checkbox" checked={selectedIds.includes(e.id)} onChange={() => toggleEmp(e.id)} />
                <span>{e.apellido}, {e.nombre}</span>
                {e.legajo && <span className="text-xs text-muted-foreground">#{e.legajo}</span>}
                {!e.activo && <Badge variant="outline" className="ml-auto">inactivo</Badge>}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setPickerOpen(false)}>Listo ({selectedIds.length})</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Guardar lista</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Ej. Activos liquidación junio" />
            <p className="text-xs text-muted-foreground">Se guardarán los {selectedIds.length} empleados seleccionados.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancelar</Button>
            <Button onClick={guardar}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
