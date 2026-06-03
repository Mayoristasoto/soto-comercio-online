import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Save, Users, X, Search, Layers } from "lucide-react";
import { toast } from "sonner";
import {
  GrupoEmpleados,
  SeleccionEmpleados,
  listarGrupos,
  resolverGrupo,
  guardarGrupo,
  MODULOS_DISPONIBLES,
} from "@/lib/gruposEmpleados";

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  legajo: string | null;
  puesto: string | null;
  sucursal_id: string | null;
  activo: boolean;
}

interface Props {
  value: SeleccionEmpleados | null;
  onChange: (v: SeleccionEmpleados | null) => void;
  modulo?: string;
  permitirIndividual?: boolean;
  permitirMultiple?: boolean;
  permitirGrupos?: boolean;
  label?: string;
}

export function SelectorEmpleadosOGrupo({
  value,
  onChange,
  modulo,
  permitirIndividual = true,
  permitirMultiple = true,
  permitirGrupos = true,
  label = "Empleados",
}: Props) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [grupos, setGrupos] = useState<GrupoEmpleados[]>([]);
  const [search, setSearch] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");

  const tab = value?.tipo ?? (permitirIndividual ? "individual" : permitirGrupos ? "grupo" : "multiple");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("empleados")
        .select("id,nombre,apellido,legajo,puesto,sucursal_id,activo")
        .eq("activo", true)
        .order("apellido");
      setEmpleados((data || []) as Empleado[]);
    })();
    if (permitirGrupos) {
      listarGrupos(modulo).then(setGrupos).catch(() => setGrupos([]));
    }
  }, [modulo, permitirGrupos]);

  const setTab = (t: string) => {
    if (t === "individual") onChange({ tipo: "individual", empleadoIds: [] });
    else if (t === "multiple") onChange({ tipo: "multiple", empleadoIds: [] });
    else onChange({ tipo: "grupo", grupoId: "", empleadoIds: [] });
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return empleados.slice(0, 50);
    return empleados
      .filter(e =>
        `${e.apellido} ${e.nombre}`.toLowerCase().includes(s) ||
        (e.legajo || "").toLowerCase().includes(s)
      )
      .slice(0, 50);
  }, [empleados, search]);

  const seleccionados = value?.empleadoIds || [];

  const toggle = (id: string) => {
    if (!value) return;
    const next = seleccionados.includes(id)
      ? seleccionados.filter(x => x !== id)
      : [...seleccionados, id];
    onChange({ ...value, empleadoIds: next });
  };

  const seleccionarIndividual = (id: string) => {
    onChange({ tipo: "individual", empleadoIds: id ? [id] : [] });
  };

  const aplicarGrupo = async (grupoId: string) => {
    if (!grupoId) {
      onChange({ tipo: "grupo", grupoId: "", empleadoIds: [] });
      return;
    }
    const ids = await resolverGrupo(grupoId);
    onChange({ tipo: "grupo", grupoId, empleadoIds: ids });
  };

  const guardarComoGrupo = async () => {
    if (!nuevoNombre.trim()) { toast.error("Poné un nombre"); return; }
    if (!seleccionados.length) { toast.error("Seleccioná empleados"); return; }
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
      setNuevoNombre("");
      setSaveOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    }
  };

  const empleadoById = (id: string) => empleados.find(e => e.id === id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {seleccionados.length > 0 && (
          <Badge variant="secondary">{seleccionados.length} seleccionado{seleccionados.length !== 1 ? "s" : ""}</Badge>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${[permitirIndividual, permitirGrupos, permitirMultiple].filter(Boolean).length}, 1fr)` }}>
          {permitirIndividual && <TabsTrigger value="individual">Individual</TabsTrigger>}
          {permitirGrupos && <TabsTrigger value="grupo">Grupo guardado</TabsTrigger>}
          {permitirMultiple && <TabsTrigger value="multiple">Selección múltiple</TabsTrigger>}
        </TabsList>

        {permitirIndividual && (
          <TabsContent value="individual" className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar empleado..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-72 overflow-auto border rounded-md divide-y">
              {filtered.map(e => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => seleccionarIndividual(e.id)}
                  className={`w-full text-left p-2 hover:bg-muted/50 flex items-center justify-between ${seleccionados[0] === e.id ? "bg-accent/30" : ""}`}
                >
                  <span>{e.apellido}, {e.nombre}</span>
                  {e.legajo && <span className="text-xs text-muted-foreground">#{e.legajo}</span>}
                </button>
              ))}
            </div>
          </TabsContent>
        )}

        {permitirGrupos && (
          <TabsContent value="grupo" className="space-y-2">
            <Select
              value={value?.tipo === "grupo" ? (value as any).grupoId || "" : ""}
              onValueChange={aplicarGrupo}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar grupo..." />
              </SelectTrigger>
              <SelectContent>
                {grupos.length === 0 && (
                  <div className="p-2 text-xs text-muted-foreground">No hay grupos. Creá uno en /rrhh/grupos-empleados</div>
                )}
                {grupos.map(g => (
                  <SelectItem key={g.id} value={g.id}>
                    <div className="flex items-center gap-2">
                      <Layers className="h-3 w-3" style={{ color: g.color || undefined }} />
                      {g.nombre}
                      {g.modulos_sugeridos?.includes(modulo || "") && (
                        <Badge variant="outline" className="text-[10px] ml-1">sugerido</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {value?.tipo === "grupo" && seleccionados.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Resolvió {seleccionados.length} empleado{seleccionados.length !== 1 ? "s" : ""}.
              </div>
            )}
          </TabsContent>
        )}

        {permitirMultiple && (
          <TabsContent value="multiple" className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2 text-xs">
              <Button size="sm" variant="outline" type="button" onClick={() => onChange({ tipo: "multiple", empleadoIds: filtered.map(e => e.id) })}>
                Marcar visibles
              </Button>
              <Button size="sm" variant="outline" type="button" onClick={() => onChange({ tipo: "multiple", empleadoIds: [] })}>
                Limpiar
              </Button>
              {permitirGrupos && seleccionados.length > 0 && (
                <Button size="sm" variant="outline" type="button" onClick={() => setSaveOpen(true)}>
                  <Save className="h-3 w-3 mr-1" /> Guardar como grupo
                </Button>
              )}
            </div>
            <div className="max-h-72 overflow-auto border rounded-md divide-y">
              {filtered.map(e => (
                <label key={e.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={seleccionados.includes(e.id)}
                    onChange={() => toggle(e.id)}
                  />
                  <span className="flex-1">{e.apellido}, {e.nombre}</span>
                  {e.puesto && <span className="text-xs text-muted-foreground">{e.puesto}</span>}
                </label>
              ))}
            </div>
            {seleccionados.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {seleccionados.slice(0, 10).map(id => {
                  const e = empleadoById(id);
                  if (!e) return null;
                  return (
                    <Badge key={id} variant="secondary" className="gap-1 pr-1">
                      {e.apellido}
                      <button type="button" onClick={() => toggle(id)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
                {seleccionados.length > 10 && <Badge variant="outline">+{seleccionados.length - 10} más</Badge>}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Guardar como grupo</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nombre del grupo</Label>
            <Input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Ej. Gerentes activos" />
            <p className="text-xs text-muted-foreground">
              Se guardarán {seleccionados.length} empleados. Quedará disponible en todos los módulos.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancelar</Button>
            <Button onClick={guardarComoGrupo}><Save className="h-4 w-4 mr-2" />Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
