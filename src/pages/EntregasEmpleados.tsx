import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Check,
  Clock,
  Loader2,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  Printer,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import DOMPurify from "dompurify";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PlantillasEntregaDialog, {
  renderPlantilla,
  type Plantilla,
} from "@/components/admin/PlantillasEntregaDialog";

type Estado = "pendiente" | "entregado" | "no_aplica";

interface Item {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activo: boolean;
  plantilla_id: string | null;
}

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  puesto: string | null;
  sucursal_id: string | null;
  legajo?: string | null;
  sucursales?: { nombre: string } | null;
}

interface Registro {
  id: string;
  empleado_id: string;
  item_id: string;
  estado: Estado;
  fecha_entrega: string | null;
  registrado_por: string | null;
  observaciones: string | null;
  detalle: string | null;
  registrado?: { nombre: string; apellido: string } | null;
}

const SIGUIENTE: Record<Estado, Estado> = {
  pendiente: "entregado",
  entregado: "no_aplica",
  no_aplica: "pendiente",
};

export default function EntregasEmpleados() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([]);
  const [puestos, setPuestos] = useState<string[]>([]);
  const [currentEmpId, setCurrentEmpId] = useState<string | null>(null);

  // filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroSucursal, setFiltroSucursal] = useState("todas");
  const [filtroPuesto, setFiltroPuesto] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "faltantes" | "completos">(
    "todos"
  );

  // gestion items
  const [gestionOpen, setGestionOpen] = useState(false);
  const [plantillasOpen, setPlantillasOpen] = useState(false);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [printPrompt, setPrintPrompt] = useState<{
    empleado: Empleado;
    item: Item;
    registroId: string;
  } | null>(null);
  const [selPlantillaId, setSelPlantillaId] = useState<string>("");
  const [detalleInput, setDetalleInput] = useState<string>("");
  const [detallePrompt, setDetallePrompt] = useState<{
    empleado: Empleado;
    item: Item;
  } | null>(null);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: emp } = await supabase
        .from("empleados")
        .select("id")
        .eq("user_id", user?.id ?? "")
        .maybeSingle();
      setCurrentEmpId(emp?.id ?? null);

      const [itemsRes, empleadosRes, registrosRes, sucursalesRes, plantillasRes] =
        await Promise.all([
          supabase
            .from("entregas_items")
            .select("*")
            .eq("activo", true)
            .order("orden", { ascending: true }),
          supabase
            .from("empleados")
            .select("id, nombre, apellido, puesto, sucursal_id, legajo, sucursales(nombre)")
            .eq("activo", true)
            .order("apellido", { ascending: true }),
          supabase
            .from("entregas_empleado")
            .select(
              "id, empleado_id, item_id, estado, fecha_entrega, registrado_por, observaciones, detalle, registrado:empleados!entregas_empleado_registrado_por_fkey(nombre, apellido)"
            ),
          supabase.from("sucursales").select("id, nombre").eq("activa", true).order("nombre"),
          supabase
            .from("plantillas_elementos")
            .select("id, nombre, tipo_elemento, template_html, activo")
            .eq("activo", true)
            .order("nombre"),
        ]);

      if (itemsRes.error) throw itemsRes.error;
      if (empleadosRes.error) throw empleadosRes.error;
      if (registrosRes.error) throw registrosRes.error;
      if (sucursalesRes.error) throw sucursalesRes.error;

      setItems((itemsRes.data ?? []) as any);
      setEmpleados((empleadosRes.data ?? []) as any);
      setRegistros((registrosRes.data ?? []) as any);
      setSucursales((sucursalesRes.data ?? []) as any);
      setPlantillas((plantillasRes.data ?? []) as any);

      const ps = Array.from(
        new Set((empleadosRes.data ?? []).map((e: any) => e.puesto).filter(Boolean))
      );
      setPuestos(ps as string[]);
    } catch (e: any) {
      console.error(e);
      toast.error("Error al cargar datos", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  // map (emp,item) -> registro
  const mapa = useMemo(() => {
    const m = new Map<string, Registro>();
    for (const r of registros) m.set(`${r.empleado_id}:${r.item_id}`, r);
    return m;
  }, [registros]);

  const empleadosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return empleados.filter((e) => {
      if (filtroSucursal !== "todas" && e.sucursal_id !== filtroSucursal) return false;
      if (filtroPuesto !== "todos" && e.puesto !== filtroPuesto) return false;
      if (q) {
        const full = `${e.nombre} ${e.apellido}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      if (filtroEstado !== "todos") {
        const estados = items.map(
          (it) => mapa.get(`${e.id}:${it.id}`)?.estado ?? "pendiente"
        );
        const tieneFaltantes = estados.some((s) => s === "pendiente");
        if (filtroEstado === "faltantes" && !tieneFaltantes) return false;
        if (filtroEstado === "completos" && tieneFaltantes) return false;
      }
      return true;
    });
  }, [empleados, busqueda, filtroSucursal, filtroPuesto, filtroEstado, mapa, items]);

  const resumen = useMemo(() => {
    let completos = 0;
    let faltantes = 0;
    for (const e of empleadosFiltrados) {
      const tieneFaltantes = items.some(
        (it) => (mapa.get(`${e.id}:${it.id}`)?.estado ?? "pendiente") === "pendiente"
      );
      if (tieneFaltantes) faltantes++;
      else completos++;
    }
    return { total: empleadosFiltrados.length, completos, faltantes };
  }, [empleadosFiltrados, items, mapa]);

  const cambiarEstado = async (empleado: Empleado, item: Item) => {
    const key = `${empleado.id}:${item.id}`;
    const actual = mapa.get(key);
    const estadoActual: Estado = actual?.estado ?? "pendiente";
    const nuevo = SIGUIENTE[estadoActual];

    // Si pasa a "entregado", pedir detalle primero
    if (nuevo === "entregado") {
      setDetalleInput(actual?.detalle ?? "");
      setDetallePrompt({ empleado, item });
      return;
    }

    await persistirEstado(empleado, item, nuevo, actual?.detalle ?? null);
  };

  const persistirEstado = async (
    empleado: Empleado,
    item: Item,
    nuevo: Estado,
    detalle: string | null
  ) => {
    const key = `${empleado.id}:${item.id}`;
    const actual = mapa.get(key);
    const prev = registros;
    const placeholder: Registro = {
      id: actual?.id ?? `tmp-${key}`,
      empleado_id: empleado.id,
      item_id: item.id,
      estado: nuevo,
      fecha_entrega: nuevo === "entregado" ? new Date().toISOString() : null,
      registrado_por: currentEmpId,
      observaciones: actual?.observaciones ?? null,
      detalle: nuevo === "entregado" ? detalle : null,
      registrado: null,
    };
    setRegistros((r) => {
      const idx = r.findIndex((x) => x.empleado_id === empleado.id && x.item_id === item.id);
      if (idx === -1) return [...r, placeholder];
      const copy = [...r];
      copy[idx] = { ...copy[idx], ...placeholder };
      return copy;
    });

    try {
      const payload: any = {
        empleado_id: empleado.id,
        item_id: item.id,
        estado: nuevo,
        registrado_por: currentEmpId,
        fecha_entrega: nuevo === "entregado" ? new Date().toISOString() : null,
        detalle: nuevo === "entregado" ? detalle : null,
      };
      const { data, error } = await supabase
        .from("entregas_empleado")
        .upsert(payload, { onConflict: "empleado_id,item_id" })
        .select(
          "id, empleado_id, item_id, estado, fecha_entrega, registrado_por, observaciones, detalle, registrado:empleados!entregas_empleado_registrado_por_fkey(nombre, apellido)"
        )
        .single();
      if (error) throw error;
      setRegistros((r) => {
        const idx = r.findIndex(
          (x) => x.empleado_id === empleado.id && x.item_id === item.id
        );
        if (idx === -1) return [...r, data as any];
        const copy = [...r];
        copy[idx] = data as any;
        return copy;
      });

      if (nuevo === "entregado" && data) {
        setSelPlantillaId(item.plantilla_id ?? plantillas[0]?.id ?? "");
        setPrintPrompt({ empleado, item, registroId: (data as any).id });
      }
    } catch (e: any) {
      console.error(e);
      setRegistros(prev);
      toast.error("No se pudo guardar", { description: e.message });
    }
  };

  const confirmarDetalle = async () => {
    if (!detallePrompt) return;
    const { empleado, item } = detallePrompt;
    setDetallePrompt(null);
    await persistirEstado(empleado, item, "entregado", detalleInput.trim() || null);
  };

  const imprimirComprobante = async () => {
    if (!printPrompt) return;
    const plantilla = plantillas.find((p) => p.id === selPlantillaId);
    if (!plantilla) {
      toast.error("Seleccioná una plantilla");
      return;
    }
    const { empleado, item, registroId } = printPrompt;
    const reg = mapa.get(`${empleado.id}:${item.id}`);
    const html = renderPlantilla(plantilla.template_html ?? "", {
      empleado_nombre: `${empleado.nombre} ${empleado.apellido}`,
      legajo: empleado.legajo ?? "",
      fecha: new Date().toLocaleDateString("es-AR"),
      item: item.nombre,
      tipo_elemento: plantilla.tipo_elemento,
      observaciones: reg?.observaciones ?? "",
      detalle: reg?.detalle ?? "",
    });
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(
        `<html><head><title>Comprobante</title><style>@media print{@page{margin:20mm}body{margin:0}}</style></head><body>${html}</body></html>`
      );
      w.document.close();
      w.focus();
      w.print();
    }
    await supabase
      .from("entregas_empleado")
      .update({ comprobante_impreso: true, comprobante_impreso_at: new Date().toISOString() })
      .eq("id", registroId);
    setPrintPrompt(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="container mx-auto p-6 flex flex-col gap-6 min-h-0 h-[calc(100dvh-9rem)] overflow-hidden">
        <div className="shrink-0 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-7 w-7" /> Entregas a Empleados
            </h1>
            <p className="text-muted-foreground">
              Visualizá y registrá la entrega de uniformes e insumos por empleado.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setPlantillasOpen(true)} variant="outline">
              <FileText className="h-4 w-4 mr-2" /> Plantillas
            </Button>
            <Button onClick={() => setGestionOpen(true)} variant="outline">
              <Pencil className="h-4 w-4 mr-2" /> Gestionar items
            </Button>
          </div>
        </div>

        <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <CardHeader className="shrink-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nombre o apellido"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sucursal</Label>
                <Select value={filtroSucursal} onValueChange={setFiltroSucursal}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las sucursales</SelectItem>
                    {sucursales.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Puesto</Label>
                <Select value={filtroPuesto} onValueChange={setFiltroPuesto}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los puestos</SelectItem>
                    {puestos.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estado</Label>
                <Select value={filtroEstado} onValueChange={(v: any) => setFiltroEstado(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="faltantes">Con faltantes</SelectItem>
                    <SelectItem value="completos">Completos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col p-6">
            <div className="overflow-auto rounded-md border flex-1 min-h-0">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-20">
                  <tr>
                    <th className="text-left px-3 py-2 sticky left-0 top-0 bg-muted z-30 min-w-[240px] border-r border-b">
                      Empleado
                    </th>
                    {items.map((it) => (
                      <th key={it.id} className="px-2 py-2 text-center min-w-[90px] sticky top-0 bg-muted z-20 border-b">
                        {it.nombre}
                      </th>
                    ))}
                    {items.length === 0 && (
                      <th className="px-3 py-2 text-muted-foreground sticky top-0 bg-muted z-20 border-b">
                        Sin items configurados
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {empleadosFiltrados.map((emp) => (
                    <tr key={emp.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 sticky left-0 bg-background z-10 border-r">
                        <div className="font-medium">
                          {emp.apellido}, {emp.nombre}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {emp.sucursales?.nombre ?? "Sin sucursal"}
                          {emp.puesto ? ` · ${emp.puesto}` : ""}
                        </div>
                      </td>
                      {items.map((it) => {
                        const reg = mapa.get(`${emp.id}:${it.id}`);
                        const estado: Estado = reg?.estado ?? "pendiente";
                        return (
                          <td key={it.id} className="px-1 py-1 text-center">
                            <CeldaEstado
                              estado={estado}
                              registro={reg}
                              onClick={() => cambiarEstado(emp, it)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {empleadosFiltrados.length === 0 && (
                    <tr>
                      <td
                        colSpan={items.length + 1}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No hay empleados con los filtros actuales
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground items-center shrink-0">
              <Leyenda />
              <div className="ml-auto flex gap-3">
                <Badge variant="outline">{resumen.total} empleados</Badge>
                <Badge variant="destructive">{resumen.faltantes} con faltantes</Badge>
                <Badge className="bg-emerald-600 hover:bg-emerald-600">
                  {resumen.completos} completos
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <GestionItemsDialog
          open={gestionOpen}
          onOpenChange={setGestionOpen}
          items={items}
          plantillas={plantillas}
          onChanged={cargar}
        />

        <PlantillasEntregaDialog
          open={plantillasOpen}
          onOpenChange={setPlantillasOpen}
          onChanged={cargar}
        />

        <AlertDialog
          open={!!printPrompt}
          onOpenChange={(v) => !v && setPrintPrompt(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Imprimir comprobante de entrega?</AlertDialogTitle>
              <AlertDialogDescription>
                {printPrompt && (
                  <>
                    Item <strong>{printPrompt.item.nombre}</strong> marcado como entregado a{" "}
                    <strong>
                      {printPrompt.empleado.apellido}, {printPrompt.empleado.nombre}
                    </strong>
                    .
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-1.5">
              <Label className="text-xs">Plantilla</Label>
              <Select value={selPlantillaId} onValueChange={setSelPlantillaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plantilla" />
                </SelectTrigger>
                <SelectContent>
                  {plantillas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {plantillas.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No hay plantillas. Creá una desde "Plantillas".
                </p>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Solo registrar</AlertDialogCancel>
              <AlertDialogAction
                onClick={imprimirComprobante}
                disabled={!selPlantillaId}
              >
                <Printer className="h-4 w-4 mr-1" /> Imprimir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={!!detallePrompt}
          onOpenChange={(v) => !v && setDetallePrompt(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalle del elemento entregado</DialogTitle>
              <DialogDescription>
                {detallePrompt && (
                  <>
                    Ingresá detalles del <strong>{detallePrompt.item.nombre}</strong> entregado a{" "}
                    <strong>
                      {detallePrompt.empleado.apellido}, {detallePrompt.empleado.nombre}
                    </strong>{" "}
                    (marca, talle, color, número de serie, etc.).
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label className="text-xs">Detalle (opcional)</Label>
              <Input
                placeholder="Ej: Marca Grafa, talle L, color azul"
                value={detalleInput}
                onChange={(e) => setDetalleInput(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmarDetalle();
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetallePrompt(null)}>
                Cancelar
              </Button>
              <Button onClick={confirmarDetalle}>
                <Check className="h-4 w-4 mr-1" /> Confirmar entrega
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

function CeldaEstado({
  estado,
  registro,
  onClick,
}: {
  estado: Estado;
  registro?: Registro;
  onClick: () => void;
}) {
  const cfg = {
    entregado: {
      icon: <Check className="h-4 w-4" />,
      cls: "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600",
      label: "Entregado",
    },
    pendiente: {
      icon: <X className="h-4 w-4" />,
      cls: "bg-red-500 hover:bg-red-600 text-white border-red-600",
      label: "No entregado",
    },
    no_aplica: {
      icon: <Minus className="h-4 w-4" />,
      cls: "bg-muted hover:bg-muted text-muted-foreground border-border",
      label: "No aplica",
    },
  }[estado];

  const tooltip = (() => {
    const partes: string[] = [cfg.label];
    if (registro?.fecha_entrega && estado === "entregado") {
      partes.push(`el ${format(new Date(registro.fecha_entrega), "dd/MM/yyyy")}`);
    }
    if (registro?.registrado) {
      partes.push(`por ${registro.registrado.nombre} ${registro.registrado.apellido}`);
    }
    return partes.join(" ");
  })();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={`inline-flex items-center justify-center h-8 w-8 rounded border transition-colors ${cfg.cls}`}
          aria-label={tooltip}
        >
          {cfg.icon}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-0.5">
          <div>{tooltip}.</div>
          {registro?.detalle && estado === "entregado" && (
            <div className="font-medium">Detalle: {registro.detalle}</div>
          )}
          <div className="text-muted-foreground">Click para cambiar.</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function Leyenda() {
  return (
    <div className="flex flex-wrap gap-3">
      <span className="flex items-center gap-1.5">
        <span className="inline-flex h-5 w-5 rounded border bg-emerald-500 text-white items-center justify-center">
          <Check className="h-3 w-3" />
        </span>
        Entregado
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-flex h-5 w-5 rounded border bg-red-500 text-white items-center justify-center">
          <X className="h-3 w-3" />
        </span>
        No entregado
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-flex h-5 w-5 rounded border bg-muted text-muted-foreground items-center justify-center">
          <Minus className="h-3 w-3" />
        </span>
        No aplica
      </span>
    </div>
  );
}

function GestionItemsDialog({
  open,
  onOpenChange,
  items,
  plantillas,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: Item[];
  plantillas: Plantilla[];
  onChanged: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);

  const crear = async () => {
    if (!nombre.trim()) {
      toast.error("Ingresá un nombre");
      return;
    }
    setSaving(true);
    try {
      const maxOrden = items.reduce((m, i) => Math.max(m, i.orden), 0);
      const { error } = await supabase.from("entregas_items").insert({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        orden: maxOrden + 1,
      });
      if (error) throw error;
      setNombre("");
      setDescripcion("");
      toast.success("Item creado");
      onChanged();
    } catch (e: any) {
      toast.error("Error", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const renombrar = async (it: Item, nuevoNombre: string) => {
    if (!nuevoNombre.trim() || nuevoNombre === it.nombre) return;
    const { error } = await supabase
      .from("entregas_items")
      .update({ nombre: nuevoNombre.trim() })
      .eq("id", it.id);
    if (error) toast.error("Error", { description: error.message });
    else {
      toast.success("Item actualizado");
      onChanged();
    }
  };

  const cambiarPlantilla = async (it: Item, plantillaId: string) => {
    const nuevo = plantillaId === "none" ? null : plantillaId;
    const { error } = await supabase
      .from("entregas_items")
      .update({ plantilla_id: nuevo })
      .eq("id", it.id);
    if (error) toast.error("Error", { description: error.message });
    else {
      toast.success("Plantilla por defecto actualizada");
      onChanged();
    }
  };

  const eliminar = async (it: Item) => {
    if (!confirm(`¿Eliminar "${it.nombre}"? Se borrarán también sus registros.`)) return;
    const { error } = await supabase.from("entregas_items").delete().eq("id", it.id);
    if (error) toast.error("Error", { description: error.message });
    else {
      toast.success("Item eliminado");
      onChanged();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Gestionar items</DialogTitle>
          <DialogDescription>
            Agregá, renombrá o eliminá items. Asigná una plantilla por defecto para imprimir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {items.map((it) => (
            <ItemEditable
              key={it.id}
              item={it}
              plantillas={plantillas}
              onRename={renombrar}
              onDelete={eliminar}
              onPlantilla={cambiarPlantilla}
            />
          ))}
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin items todavía.</p>
          )}
        </div>

        <div className="border-t pt-3 space-y-2">
          <Label className="text-xs">Nuevo item</Label>
          <Input
            placeholder="Nombre (ej: Casco)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <Input
            placeholder="Descripción (opcional)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={crear} disabled={saving}>
            <Plus className="h-4 w-4 mr-1" /> Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItemEditable({
  item,
  plantillas,
  onRename,
  onDelete,
  onPlantilla,
}: {
  item: Item;
  plantillas: Plantilla[];
  onRename: (it: Item, nuevo: string) => void;
  onDelete: (it: Item) => void;
  onPlantilla: (it: Item, plantillaId: string) => void;
}) {
  const [valor, setValor] = useState(item.nombre);
  useEffect(() => setValor(item.nombre), [item.nombre]);
  return (
    <div className="flex items-center gap-2">
      <Input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={() => onRename(item, valor)}
        className="h-8 flex-1"
      />
      <Select
        value={item.plantilla_id ?? "none"}
        onValueChange={(v) => onPlantilla(item, v)}
      >
        <SelectTrigger className="h-8 w-44">
          <SelectValue placeholder="Plantilla" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sin plantilla</SelectItem>
          {plantillas.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive"
        onClick={() => onDelete(item)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
