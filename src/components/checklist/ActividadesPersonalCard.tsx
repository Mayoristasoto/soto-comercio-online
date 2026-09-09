import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Loader2, Plus, Trash2, Users } from "lucide-react";
import { formatArgentinaDateTime } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

const OTRA = "__otra__";
const NINGUNO = "none";

export const ORIGEN_OPCIONES: { value: string; label: string; cls: string }[] = [
  { value: "encargado", label: "Se la asignó el encargado", cls: "bg-primary/10 text-primary border-primary/30" },
  { value: "rutina", label: "Rutina habitual del puesto", cls: "bg-success/10 text-success border-success/30" },
  { value: "iniciativa", label: "Iniciativa propia", cls: "bg-warning/10 text-warning border-warning/30" },
  { value: "otro", label: "Otro / a definir", cls: "bg-muted text-muted-foreground border-border" },
  { value: "sin_definir", label: "Sin definir", cls: "bg-muted text-muted-foreground border-border" },
];

const ACTIVIDADES_SUGERIDAS = [
  "Reposición de góndola",
  "Atención al cliente",
  "Recepción de mercadería",
  "Control de vencimientos",
  "Limpieza",
  "Preparación de pedidos",
  "Traspasos",
  "Control de stock",
  "Caja",
  "Depósito",
];

interface Actividad {
  id: string;
  empleado_id: string | null;
  empleado_nombre: string | null;
  actividad: string;
  registrado_at: string;
  origen_asignacion: string;
  asignado_por_id: string | null;
  asignado_por_nombre: string | null;
  observaciones: string | null;
}

interface EmpleadoOpt {
  id: string;
  nombre: string;
}

interface Props {
  controlId: string;
  readOnly?: boolean;
  compacto?: boolean;
}

export function ActividadesPersonalCard({ controlId, readOnly = false, compacto = false }: Props) {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [empleadoId, setEmpleadoId] = useState<string>(OTRA);
  const [empleadoLibre, setEmpleadoLibre] = useState("");
  const [actividad, setActividad] = useState("");
  const [origen, setOrigen] = useState("encargado");
  const [asignadoPorId, setAsignadoPorId] = useState<string>(NINGUNO);
  const [asignadoPorLibre, setAsignadoPorLibre] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const cargar = async () => {
    setLoading(true);
    try {
      const db = supabase as any;
      const [act, emp] = await Promise.all([
        db
          .from("checklist_control_actividades")
          .select("*")
          .eq("control_id", controlId)
          .order("registrado_at", { ascending: false }),
        db
          .from("empleados")
          .select("id, nombre, apellido")
          .eq("activo", true)
          .order("apellido"),
      ]);
      setActividades((act.data || []) as Actividad[]);
      setEmpleados(
        (emp.data || []).map((e: any) => ({ id: e.id, nombre: `${e.apellido} ${e.nombre}` }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlId]);

  const mapEmpleados = useMemo(
    () => new Map(empleados.map((e) => [e.id, e.nombre])),
    [empleados]
  );

  const nombreDe = (a: Actividad) =>
    (a.empleado_id ? mapEmpleados.get(a.empleado_id) : null) || a.empleado_nombre || "Sin identificar";

  const asignadorDe = (a: Actividad) =>
    (a.asignado_por_id ? mapEmpleados.get(a.asignado_por_id) : null) || a.asignado_por_nombre || null;

  const limpiar = () => {
    setEmpleadoId(OTRA);
    setEmpleadoLibre("");
    setActividad("");
    setOrigen("encargado");
    setAsignadoPorId(NINGUNO);
    setAsignadoPorLibre("");
    setObservaciones("");
  };

  const registrar = async () => {
    const nombreLibre = empleadoLibre.trim();
    if (empleadoId === OTRA && !nombreLibre) {
      toast.error("Indicá quién es la persona");
      return;
    }
    if (!actividad.trim()) {
      toast.error("Indicá qué está haciendo");
      return;
    }
    setGuardando(true);
    try {
      const db = supabase as any;
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await db
        .from("checklist_control_actividades")
        .insert({
          control_id: controlId,
          empleado_id: empleadoId === OTRA ? null : empleadoId,
          empleado_nombre: empleadoId === OTRA ? nombreLibre : null,
          actividad: actividad.trim(),
          origen_asignacion: origen,
          asignado_por_id: origen === "encargado" && asignadoPorId !== NINGUNO ? asignadoPorId : null,
          asignado_por_nombre:
            origen === "encargado" && asignadoPorId === NINGUNO && asignadoPorLibre.trim()
              ? asignadoPorLibre.trim()
              : null,
          observaciones: observaciones.trim() || null,
          registrado_at: new Date().toISOString(),
          registrado_por: userData.user?.id ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      setActividades((prev) => [data as Actividad, ...prev]);
      limpiar();
      toast.success("Actividad registrada con hora");
    } catch (e: any) {
      toast.error("No se pudo registrar: " + (e.message || e));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id: string) => {
    const db = supabase as any;
    const { error } = await db.from("checklist_control_actividades").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo eliminar: " + error.message);
      return;
    }
    setActividades((prev) => prev.filter((a) => a.id !== id));
  };

  const origenInfo = (value: string) =>
    ORIGEN_OPCIONES.find((o) => o.value === value) ?? ORIGEN_OPCIONES[ORIGEN_OPCIONES.length - 1];

  return (
    <Card>
      <CardHeader className={compacto ? "pb-3" : undefined}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" />
          Actividad del personal en turno
        </CardTitle>
        <CardDescription>
          Registrá qué está haciendo cada persona en el momento del control, con hora automática y quién le asignó
          la tarea.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {actividades.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no hay registros de actividad.</p>
            ) : (
              <div className="space-y-2">
                {actividades.map((a) => {
                  const oi = origenInfo(a.origen_asignacion);
                  const asignador = asignadorDe(a);
                  return (
                    <div key={a.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-medium">{nombreDe(a)}</p>
                          <p className="text-sm">{a.actividad}</p>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Clock className="h-3 w-3" />
                              {formatArgentinaDateTime(a.registrado_at)}
                            </Badge>
                            <Badge variant="outline" className={cn("text-xs", oi.cls)}>
                              {oi.label}
                            </Badge>
                            {asignador && (
                              <Badge variant="outline" className="text-xs">
                                Asignó: {asignador}
                              </Badge>
                            )}
                          </div>
                          {a.observaciones && (
                            <p className="whitespace-pre-wrap pt-1 text-xs text-muted-foreground">
                              {a.observaciones}
                            </p>
                          )}
                        </div>
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 text-muted-foreground"
                            onClick={() => eliminar(a.id)}
                            aria-label="Eliminar registro"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!readOnly && (
              <div className="space-y-3 rounded-lg border border-dashed p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Persona</Label>
                    <Select
                      value={empleadoId}
                      onValueChange={(v) => {
                        setEmpleadoId(v);
                        if (v !== OTRA) setEmpleadoLibre("");
                      }}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Elegí una persona" />
                      </SelectTrigger>
                      <SelectContent>
                        {empleados.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.nombre}
                          </SelectItem>
                        ))}
                        <SelectItem value={OTRA}>Otra persona (escribir)</SelectItem>
                      </SelectContent>
                    </Select>
                    {empleadoId === OTRA && (
                      <Input
                        className="h-11"
                        placeholder="Nombre y apellido"
                        maxLength={120}
                        value={empleadoLibre}
                        onChange={(e) => setEmpleadoLibre(e.target.value)}
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label>¿Quién le asignó la tarea?</Label>
                    <Select value={origen} onValueChange={setOrigen}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORIGEN_OPCIONES.filter((o) => o.value !== "sin_definir").map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {origen === "encargado" && (
                      <>
                        <Select value={asignadoPorId} onValueChange={setAsignadoPorId}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Encargado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NINGUNO}>Escribir nombre</SelectItem>
                            {empleados.map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {asignadoPorId === NINGUNO && (
                          <Input
                            className="h-11"
                            placeholder="Quién asignó la tarea"
                            maxLength={120}
                            value={asignadoPorLibre}
                            onChange={(e) => setAsignadoPorLibre(e.target.value)}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>¿Qué está haciendo en este momento?</Label>
                  <Input
                    className="h-11"
                    placeholder="Descripción de la tarea"
                    maxLength={300}
                    value={actividad}
                    onChange={(e) => setActividad(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {ACTIVIDADES_SUGERIDAS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setActividad(s)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs",
                          actividad === s ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <Textarea
                  rows={2}
                  maxLength={2000}
                  placeholder="Observaciones (opcional)"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />

                <Button className="h-11 w-full sm:w-auto" onClick={registrar} disabled={guardando}>
                  {guardando ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Registrar con hora actual
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
