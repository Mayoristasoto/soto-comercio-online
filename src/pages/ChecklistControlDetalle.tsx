import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ClipboardCheck, Loader2, Lock, Plus, Smartphone, Unlock } from "lucide-react";
import { formatArgentinaDateTime } from "@/lib/dateUtils";
import { ResumenChecklist } from "@/components/checklist/ResumenChecklist";
import { ChecklistItemRow } from "@/components/checklist/ChecklistItemRow";
import { ChecklistModoGuiado } from "@/components/checklist/ChecklistModoGuiado";
import { useIsMobile } from "@/hooks/use-mobile";
import type {
  ChecklistControl,
  ChecklistEstadoItem,
  ChecklistFoto,
  ChecklistItem,
} from "@/components/checklist/checklistTypes";

const SIN_SECCION = "__sin_seccion__";

export default function ChecklistControlDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [control, setControl] = useState<ChecklistControl | null>(null);
  const [sucursalNombre, setSucursalNombre] = useState<string | null>(null);
  const [encargados, setEncargados] = useState<string[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [fotos, setFotos] = useState<ChecklistFoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevoItem, setNuevoItem] = useState("");
  const [obsGeneral, setObsGeneral] = useState("");
  const isMobile = useIsMobile();
  const [modoGuiado, setModoGuiado] = useState<boolean | null>(null);
  const guiadoActivo = modoGuiado ?? isMobile;

  const readOnly = control?.estado === "cerrado";

  const secciones = (() => {
    const mapa = new Map<string, ChecklistItem[]>();
    items.forEach((i) => {
      const key = i.seccion?.trim() || SIN_SECCION;
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key)!.push(i);
    });
    return Array.from(mapa.entries());
  })();

  const cargar = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const db = supabase as any;
      const { data: ctrl, error } = await db.from("checklist_controles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!ctrl) {
        toast.error("Control no encontrado");
        navigate("/rrhh/checklist");
        return;
      }
      setControl(ctrl as ChecklistControl);
      setObsGeneral(ctrl.observaciones_generales ?? "");

      const suc = await db.from("sucursales").select("nombre").eq("id", ctrl.sucursal_id).maybeSingle();
      setSucursalNombre(suc.data?.nombre ?? null);

      const enc = await db
        .from("checklist_control_encargados")
        .select("empleado_id, empleados(nombre, apellido)")
        .eq("control_id", id);
      setEncargados(
        (enc.data || []).map((e: any) =>
          e.empleados ? `${e.empleados.apellido} ${e.empleados.nombre}` : "Empleado"
        )
      );

      const its = await db.from("checklist_control_items").select("*").eq("control_id", id).order("orden");
      const itemsData = (its.data || []) as ChecklistItem[];
      setItems(itemsData);

      if (itemsData.length) {
        const ft = await db
          .from("checklist_item_fotos")
          .select("id, item_id, storage_path")
          .in("item_id", itemsData.map((i) => i.id));
        setFotos((ft.data || []) as ChecklistFoto[]);
      } else {
        setFotos([]);
      }
    } catch (e: any) {
      toast.error("Error al cargar el control: " + (e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const recargarFotos = async () => {
    if (!items.length) return;
    const db = supabase as any;
    const ft = await db
      .from("checklist_item_fotos")
      .select("id, item_id, storage_path")
      .in("item_id", items.map((i) => i.id));
    setFotos((ft.data || []) as ChecklistFoto[]);
  };

  const actualizarItem = async (itemId: string, patch: Partial<ChecklistItem>) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
    const db = supabase as any;
    const { error } = await db.from("checklist_control_items").update(patch).eq("id", itemId);
    if (error) toast.error("No se pudo guardar: " + error.message);
  };

  const agregarItem = async () => {
    if (!nuevoItem.trim() || !id) return;
    const db = supabase as any;
    const { data, error } = await db
      .from("checklist_control_items")
      .insert({ control_id: id, texto: nuevoItem.trim(), orden: items.length })
      .select("*")
      .single();
    if (error) {
      toast.error("No se pudo agregar el ítem: " + error.message);
      return;
    }
    setItems((prev) => [...prev, data as ChecklistItem]);
    setNuevoItem("");
  };

  const eliminarItem = async (itemId: string) => {
    const db = supabase as any;
    const { error } = await db.from("checklist_control_items").delete().eq("id", itemId);
    if (error) {
      toast.error("No se pudo eliminar el ítem: " + error.message);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const guardarObsGeneral = async () => {
    if (!id) return;
    const db = supabase as any;
    await db.from("checklist_controles").update({ observaciones_generales: obsGeneral }).eq("id", id);
  };

  const cambiarEstado = async (cerrar: boolean) => {
    if (!id) return;
    const db = supabase as any;
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await db
      .from("checklist_controles")
      .update(
        cerrar
          ? { estado: "cerrado", cerrado_at: new Date().toISOString(), cerrado_por: userData.user?.id ?? null }
          : { estado: "borrador", cerrado_at: null, cerrado_por: null }
      )
      .eq("id", id);
    if (error) {
      toast.error("No se pudo actualizar el estado: " + error.message);
      return;
    }
    toast.success(cerrar ? "Control cerrado" : "Control reabierto");
    cargar();
  };

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (guiadoActivo && control) {
    return (
      <ChecklistModoGuiado
        titulo={control.titulo || "Control"}
        sucursalNombre={sucursalNombre}
        fechaTexto={formatArgentinaDateTime(control.fecha_hora)}
        items={items}
        fotos={fotos}
        readOnly={readOnly}
        obsGeneral={obsGeneral}
        onObsGeneralChange={setObsGeneral}
        onObsGeneralBlur={guardarObsGeneral}
        onEstado={(itemId, estado) => actualizarItem(itemId, { estado })}
        onObservaciones={(itemId, observaciones) => actualizarItem(itemId, { observaciones })}
        onFotosChange={recargarFotos}
        onCerrar={() => cambiarEstado(true)}
        onSalir={() => setModoGuiado(false)}
      />
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link to="/rrhh/checklist">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al historial
            </Link>
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            {control?.titulo || "Control"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {sucursalNombre ?? "—"} · {control ? formatArgentinaDateTime(control.fecha_hora) : ""}
          </p>
          {encargados.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {encargados.map((e) => (
                <Badge key={e} variant="outline">
                  {e}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={readOnly ? "secondary" : "outline"}>{readOnly ? "Cerrado" : "Borrador"}</Badge>
          <Button variant={readOnly ? "outline" : "default"} onClick={() => cambiarEstado(!readOnly)}>
            {readOnly ? <Unlock className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
            {readOnly ? "Reabrir" : "Cerrar control"}
          </Button>
        </div>
      </header>

      <ResumenChecklist items={items} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ítems del control</CardTitle>
          <CardDescription>
            Marcá el estado de cada ítem, agregá observaciones y subí fotos como evidencia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">Todavía no hay ítems. Agregá el primero abajo.</p>
          )}

          {secciones.map(([seccion, secItems]) => (
            <div key={seccion} className="space-y-2">
              {seccion !== SIN_SECCION && (
                <div className="flex items-center justify-between gap-2 border-b pb-1">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{seccion}</h2>
                  <ResumenChecklist items={secItems} compacto />
                </div>
              )}
              {secItems.map((item) => (
                <ChecklistItemRow
                  key={item.id}
                  item={item}
                  fotos={fotos.filter((f) => f.item_id === item.id)}
                  readOnly={readOnly}
                  onEstado={(estado: ChecklistEstadoItem | null) => actualizarItem(item.id, { estado })}
                  onObservaciones={(observaciones) => actualizarItem(item.id, { observaciones })}
                  onEliminar={readOnly ? undefined : () => eliminarItem(item.id)}
                  onFotosChange={recargarFotos}
                />
              ))}
            </div>
          ))}

          {!readOnly && (
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Input
                placeholder="Nuevo ítem de control"
                value={nuevoItem}
                maxLength={300}
                onChange={(e) => setNuevoItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") agregarItem();
                }}
              />
              <Button onClick={agregarItem} disabled={!nuevoItem.trim()} className="sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Agregar ítem
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observaciones generales</CardTitle>
        </CardHeader>
        <CardContent>
          {readOnly ? (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{obsGeneral || "Sin observaciones."}</p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="obs-general" className="sr-only">
                Observaciones generales
              </Label>
              <Textarea
                id="obs-general"
                rows={4}
                maxLength={4000}
                value={obsGeneral}
                onChange={(e) => setObsGeneral(e.target.value)}
                onBlur={guardarObsGeneral}
                placeholder="Conclusiones del control, acciones acordadas, plazos..."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
