import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarClock, Lock, LockOpen, Plus, RefreshCw, Trash2 } from "lucide-react";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import {
  DIAS_SEMANA,
  Disponibilidad,
  EntrevistasConfig,
  Excepcion,
  Slot,
  hhmm,
} from "./entrevistasTypes";

const db = supabase as any;

interface Props {
  soloLectura?: boolean;
  onCambio?: () => void;
}

export default function ConfiguracionDisponibilidad({ soloLectura, onCambio }: Props) {
  const [config, setConfig] = useState<EntrevistasConfig | null>(null);
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([]);
  const [reglas, setReglas] = useState<Disponibilidad[]>([]);
  const [excepciones, setExcepciones] = useState<Excepcion[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nuevaExc, setNuevaExc] = useState({
    fecha: "",
    tipo: "bloqueo_dia" as Excepcion["tipo"],
    hora_inicio: "14:00",
    hora_fin: "16:00",
    motivo: "",
  });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data: sucs } = await db.from("sucursales").select("id, nombre").eq("activo", true).order("nombre");
      setSucursales(sucs || []);

      let { data: cfgs } = await db
        .from("entrevistas_config")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1);

      let cfg = cfgs?.[0] ?? null;
      if (!cfg && !soloLectura) {
        const { data: creada, error } = await db
          .from("entrevistas_config")
          .insert({ nombre: "Entrevistas RRHH", duracion_minutos: 30 })
          .select()
          .single();
        if (error) throw error;
        cfg = creada;
      }
      setConfig(cfg);

      if (cfg) {
        const [{ data: rs }, { data: ex }, { data: sl }] = await Promise.all([
          db.from("entrevistas_disponibilidad").select("*").eq("config_id", cfg.id).order("dia_semana"),
          db.from("entrevistas_excepciones").select("*").eq("config_id", cfg.id).order("fecha"),
          db
            .from("entrevistas_slots")
            .select("*")
            .eq("config_id", cfg.id)
            .gte("fecha", format(new Date(), "yyyy-MM-dd"))
            .order("fecha")
            .order("hora_inicio")
            .limit(500),
        ]);
        setReglas(rs || []);
        setExcepciones(ex || []);
        setSlots(sl || []);
      }
    } catch (e: any) {
      toast.error("No se pudo cargar la configuración: " + (e.message || e));
    } finally {
      setCargando(false);
    }
  }, [soloLectura]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardarConfig = async (cambios: Partial<EntrevistasConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...cambios } as EntrevistasConfig);
    const { error } = await db.from("entrevistas_config").update(cambios).eq("id", config.id);
    if (error) toast.error("No se pudo guardar: " + error.message);
  };

  const reglaDe = (dia: number) => reglas.find((r) => r.dia_semana === dia);

  const toggleDia = async (dia: number, activo: boolean) => {
    if (!config) return;
    const regla = reglaDe(dia);
    if (regla) {
      const { error } = await db.from("entrevistas_disponibilidad").update({ activo }).eq("id", regla.id);
      if (error) return toast.error(error.message);
      setReglas((prev) => prev.map((r) => (r.id === regla.id ? { ...r, activo } : r)));
    } else {
      const { data, error } = await db
        .from("entrevistas_disponibilidad")
        .insert({ config_id: config.id, dia_semana: dia, hora_inicio: "14:00", hora_fin: "16:00", activo })
        .select()
        .single();
      if (error) return toast.error(error.message);
      setReglas((prev) => [...prev, data]);
    }
  };

  const guardarHora = async (dia: number, campo: "hora_inicio" | "hora_fin", valor: string) => {
    const regla = reglaDe(dia);
    if (!regla) return;
    setReglas((prev) => prev.map((r) => (r.id === regla.id ? { ...r, [campo]: valor } : r)));
    const { error } = await db.from("entrevistas_disponibilidad").update({ [campo]: valor }).eq("id", regla.id);
    if (error) toast.error(error.message);
  };

  const generarHorarios = async () => {
    if (!config) return;
    const desde = format(new Date(), "yyyy-MM-dd");
    const hasta = format(addDays(new Date(), 56), "yyyy-MM-dd");
    const { error } = await db.rpc("entrevistas_generar_slots", {
      _config_id: config.id,
      _desde: desde,
      _hasta: hasta,
    });
    if (error) return toast.error("No se pudieron generar los horarios: " + error.message);
    toast.success("Horarios generados para las próximas 8 semanas");
    cargar();
    onCambio?.();
  };

  const cambiarEstadoSlot = async (slot: Slot, estado: "disponible" | "bloqueado") => {
    const { error } = await db.from("entrevistas_slots").update({ estado }).eq("id", slot.id);
    if (error) return toast.error(error.message);
    setSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, estado } : s)));
    onCambio?.();
  };

  const agregarExcepcion = async () => {
    if (!config || !nuevaExc.fecha) return toast.error("Elegí una fecha");
    const payload: any = {
      config_id: config.id,
      fecha: nuevaExc.fecha,
      tipo: nuevaExc.tipo,
      motivo: nuevaExc.motivo || null,
    };
    if (nuevaExc.tipo === "disponibilidad_extra") {
      payload.hora_inicio = nuevaExc.hora_inicio;
      payload.hora_fin = nuevaExc.hora_fin;
    }
    const { data, error } = await db.from("entrevistas_excepciones").insert(payload).select().single();
    if (error) return toast.error(error.message);
    setExcepciones((prev) => [...prev, data]);
    setNuevaExc({ ...nuevaExc, fecha: "", motivo: "" });
    toast.success("Excepción agregada. Volvé a generar los horarios para aplicarla.");
  };

  const borrarExcepcion = async (id: string) => {
    const { error } = await db.from("entrevistas_excepciones").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setExcepciones((prev) => prev.filter((e) => e.id !== id));
  };

  if (cargando) return <p className="text-muted-foreground p-4">Cargando…</p>;
  if (!config)
    return <p className="text-muted-foreground p-4">No hay una configuración de entrevistas disponible.</p>;

  const slotsPorFecha = slots.reduce<Record<string, Slot[]>>((acc, s) => {
    (acc[s.fecha] = acc[s.fecha] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" /> Cómo se hacen las entrevistas
          </CardTitle>
          <CardDescription>Duración, lugar y mensaje que se le envía al candidato.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Duración de cada entrevista</Label>
            <Select
              value={String(config.duracion_minutos)}
              onValueChange={(v) => guardarConfig({ duracion_minutos: Number(v) })}
              disabled={soloLectura}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[15, 30, 45, 60].map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m} minutos
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sucursal donde se realiza</Label>
            <Select
              value={config.sucursal_id ?? "none"}
              onValueChange={(v) => guardarConfig({ sucursal_id: v === "none" ? null : v })}
              disabled={soloLectura}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin definir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin definir</SelectItem>
                {sucursales.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Dirección o lugar que ve el candidato</Label>
            <Input
              value={config.direccion ?? ""}
              placeholder="Ej: Olazar 26, Mar del Plata"
              onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
              onBlur={(e) => guardarConfig({ direccion: e.target.value })}
              disabled={soloLectura}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Mensaje de WhatsApp (opcional)</Label>
            <Input
              value={config.mensaje_whatsapp ?? ""}
              placeholder="Usá [Nombre], [Puesto] y [LINK_UNICO]"
              onChange={(e) => setConfig({ ...config, mensaje_whatsapp: e.target.value })}
              onBlur={(e) => guardarConfig({ mensaje_whatsapp: e.target.value || null })}
              disabled={soloLectura}
            />
            <p className="text-xs text-muted-foreground">
              Si lo dejás vacío se usa el mensaje estándar de Mayorista Soto.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Días y horarios</CardTitle>
            <CardDescription>Cada día puede tener su propio horario.</CardDescription>
          </div>
          {!soloLectura && (
            <Button onClick={generarHorarios} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Generar horarios
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {DIAS_SEMANA.map((d) => {
            const regla = reglaDe(d.valor);
            const activo = !!regla?.activo;
            return (
              <div key={d.valor} className="flex flex-wrap items-center gap-3 rounded-md border p-3">
                <Switch checked={activo} onCheckedChange={(v) => toggleDia(d.valor, v)} disabled={soloLectura} />
                <span className="w-24 font-medium">{d.nombre}</span>
                <Input
                  type="time"
                  className="w-28"
                  value={hhmm(regla?.hora_inicio) || "14:00"}
                  onChange={(e) => guardarHora(d.valor, "hora_inicio", e.target.value)}
                  disabled={!activo || soloLectura}
                />
                <span className="text-muted-foreground">a</span>
                <Input
                  type="time"
                  className="w-28"
                  value={hhmm(regla?.hora_fin) || "16:00"}
                  onChange={(e) => guardarHora(d.valor, "hora_fin", e.target.value)}
                  disabled={!activo || soloLectura}
                />
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            Después de cambiar días u horarios, tocá "Generar horarios" para actualizar la agenda.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Excepciones por fecha</CardTitle>
          <CardDescription>Bloqueá un día completo o agregá disponibilidad extra.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!soloLectura && (
            <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
              <div className="space-y-1">
                <Label className="text-xs">Fecha</Label>
                <Input
                  type="date"
                  className="w-40"
                  value={nuevaExc.fecha}
                  onChange={(e) => setNuevaExc({ ...nuevaExc, fecha: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={nuevaExc.tipo}
                  onValueChange={(v) => setNuevaExc({ ...nuevaExc, tipo: v as Excepcion["tipo"] })}
                >
                  <SelectTrigger className="w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bloqueo_dia">Bloquear el día completo</SelectItem>
                    <SelectItem value="disponibilidad_extra">Disponibilidad extra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {nuevaExc.tipo === "disponibilidad_extra" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Desde</Label>
                    <Input
                      type="time"
                      className="w-28"
                      value={nuevaExc.hora_inicio}
                      onChange={(e) => setNuevaExc({ ...nuevaExc, hora_inicio: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Hasta</Label>
                    <Input
                      type="time"
                      className="w-28"
                      value={nuevaExc.hora_fin}
                      onChange={(e) => setNuevaExc({ ...nuevaExc, hora_fin: e.target.value })}
                    />
                  </div>
                </>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Motivo</Label>
                <Input
                  className="w-48"
                  value={nuevaExc.motivo}
                  onChange={(e) => setNuevaExc({ ...nuevaExc, motivo: e.target.value })}
                />
              </div>
              <Button onClick={agregarExcepcion} className="gap-2">
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </div>
          )}
          {excepciones.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin excepciones cargadas.</p>
          ) : (
            excepciones.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span>
                  {format(new Date(e.fecha + "T00:00:00"), "EEEE d 'de' MMMM", { locale: es })} ·{" "}
                  {e.tipo === "bloqueo_dia"
                    ? "Día bloqueado"
                    : `Extra ${hhmm(e.hora_inicio)} a ${hhmm(e.hora_fin)}`}
                  {e.motivo ? ` · ${e.motivo}` : ""}
                </span>
                {!soloLectura && (
                  <Button variant="ghost" size="icon" onClick={() => borrarExcepcion(e.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horarios generados</CardTitle>
          <CardDescription>Podés bloquear o liberar cada horario puntual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(slotsPorFecha).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay horarios. Configurá los días y tocá "Generar horarios".
            </p>
          ) : (
            Object.entries(slotsPorFecha).map(([fecha, lista]) => (
              <div key={fecha}>
                <p className="mb-2 text-sm font-semibold uppercase">
                  {format(new Date(fecha + "T00:00:00"), "EEEE d 'de' MMMM", { locale: es })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {lista.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-1 rounded-md border px-2 py-1 text-sm"
                    >
                      <span>{hhmm(s.hora_inicio)}</span>
                      <Badge
                        variant={
                          s.estado === "reservado"
                            ? "default"
                            : s.estado === "bloqueado"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {s.estado === "reservado"
                          ? "Reservado"
                          : s.estado === "bloqueado"
                          ? "Bloqueado"
                          : "Disponible"}
                      </Badge>
                      {!soloLectura && s.estado !== "reservado" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={s.estado === "bloqueado" ? "Desbloquear" : "Bloquear"}
                          onClick={() =>
                            cambiarEstadoSlot(s, s.estado === "bloqueado" ? "disponible" : "bloqueado")
                          }
                        >
                          {s.estado === "bloqueado" ? (
                            <LockOpen className="h-4 w-4" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
