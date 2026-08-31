import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BandejaPlanificacionesRRHH } from "@/components/fichero/BandejaPlanificacionesRRHH";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeftRight,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  CopyPlus,
  Download,
  Info,
  RotateCcw,
  Save,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  VistaDiaPlanificacion,
  type DatosDiaPlanificacion,
} from "@/components/fichero/VistaDiaPlanificacion";
import {
  RotarEmpleadosDialog,
  type FilaRotacion,
  type ModoRotacion,
} from "@/components/fichero/RotarEmpleadosDialog";
import { escribirBorradorDia, nuevoTramoId } from "@/hooks/useDiaBorrador";
import { useEsRRHH } from "@/hooks/useEsRRHH";
import { exportSemanaPDF, exportSemanaXLSX, exportSemanaResumenPDF, type DiaSemanaExport } from "@/utils/horariosDiaExport";

const DIA_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Lunes de la semana que contiene la fecha */
function lunesDe(fecha: string) {
  const d = new Date(`${fecha}T00:00:00`);
  const dow = d.getDay(); // 0 domingo
  const delta = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + delta);
  return iso(d);
}

function sumarDias(fecha: string, n: number) {
  const d = new Date(`${fecha}T00:00:00`);
  d.setDate(d.getDate() + n);
  return iso(d);
}

const fechaCorta = (f: string) => f.slice(8, 10) + "/" + f.slice(5, 7);

interface PlanGuardado {
  id: string;
  nombre: string | null;
  fecha_inicio_semana: string;
  estado: string | null;
  notas: string | null;
  aplicada_at: string | null;
  aprobada_at: string | null;
  motivo_rechazo: string | null;
  sucursal_id: string | null;
}

const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador",
  pendiente_aprobacion: "Pendiente de aprobación RRHH",
  aprobada: "Aprobada por RRHH",
  confirmado: "Confirmada",
  rechazada: "Rechazada por RRHH",
};

const estadoTexto = (e?: string | null) => ESTADO_LABEL[e || "borrador"] || e || "borrador";

interface VistaSemanaProps {
  /** Vista simplificada para encargados: solo su sucursal, sin costos ni aplicar */
  modoEncargado?: boolean;
  /** Sucursal fija (obligatoria en modoEncargado) */
  sucursalId?: string | null;
}

export function VistaSemanaPlanificacion({ modoEncargado = false, sucursalId = null }: VistaSemanaProps = {}) {
  const { toast } = useToast();
  const { esRRHH } = useEsRRHH();
  const [inicio, setInicio] = useState(() => lunesDe(iso(new Date())));
  const [diaSel, setDiaSel] = useState(0);
  const [datos, setDatos] = useState<Record<string, DatosDiaPlanificacion>>({});
  const [remountKey, setRemountKey] = useState(0);


  const [planes, setPlanes] = useState<PlanGuardado[]>([]);
  const [planActual, setPlanActual] = useState<PlanGuardado | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [notas, setNotas] = useState("");
  const [estado, setEstado] = useState("borrador");
  const [aprobando, setAprobando] = useState(false);
  const [copiarDe, setCopiarDe] = useState<string>("");
  const [copiaOpen, setCopiaOpen] = useState(false);
  const [copiaOrigen, setCopiaOrigen] = useState(0);
  const [copiaDestinos, setCopiaDestinos] = useState<number[]>([]);
  const [rotarOpen, setRotarOpen] = useState(false);
  const [rotaciones, setRotaciones] = useState<string[]>([]);

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => sumarDias(inicio, i)), [inicio]);
  const fechaActual = dias[diaSel];

  const cargarPlanes = useCallback(async () => {
    let q = supabase
      .from("planificacion_semanal")
      .select(
        "id, nombre, fecha_inicio_semana, estado, notas, aplicada_at, aprobada_at, motivo_rechazo, sucursal_id"
      )
      .order("fecha_inicio_semana", { ascending: false })
      .limit(60);
    if (modoEncargado && sucursalId) q = q.eq("sucursal_id", sucursalId);
    const { data } = await q;
    setPlanes((data || []) as PlanGuardado[]);
  }, [modoEncargado, sucursalId]);


  useEffect(() => {
    cargarPlanes();
  }, [cargarPlanes]);

  // Al cambiar de semana se busca si ya hay una planificación guardada
  useEffect(() => {
    setPlanActual(planes.find((p) => p.fecha_inicio_semana === inicio) ?? null);
  }, [planes, inicio]);

  const registrarDatos = useCallback((d: DatosDiaPlanificacion) => {
    setDatos((prev) => ({ ...prev, [d.fecha]: d }));
  }, []);

  const diasExport: DiaSemanaExport[] = dias.map((f) => ({
    fecha: f,
    filas: datos[f]?.filasExport ?? [],
    cobertura: datos[f]?.cobertura ?? [],
  }));

  const totalHoras = dias.reduce((a, f) => a + (datos[f]?.totalHoras ?? 0), 0);
  const totalExtras = dias.reduce((a, f) => a + (datos[f]?.totalExtras ?? 0), 0);
  const valorHoraExtra = datos[fechaActual]?.valorHoraExtra ?? 0;
  const empleadosSemana = new Set(
    dias.flatMap((f) => (datos[f]?.filas ?? []).map((x) => x.empleado_id))
  ).size;

  const cambiarSemana = (delta: number) => setInicio(sumarDias(inicio, delta * 7));

  /* ------------------------- Guardar ------------------------- */

  const guardar = async () => {
    setGuardando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      let empleadoId: string | null = null;
      if (userData.user?.id) {
        const { data: emp } = await supabase
          .from("empleados")
          .select("id")
          .eq("user_id", userData.user.id)
          .maybeSingle();
        empleadoId = emp?.id ?? null;
      }

      const payloadCabecera: any = {
        fecha_inicio_semana: inicio,
        nombre: nombre.trim() || `Semana del ${fechaCorta(inicio)}`,
        notas: notas.trim() || null,
        estado,
        creado_por: empleadoId,
        sucursal_id: modoEncargado ? sucursalId : planActual?.sucursal_id ?? null,
      };

      // Los encargados siempre guardan borrador: la validación se envía aparte
      if (modoEncargado) {
        payloadCabecera.estado = "borrador";
        payloadCabecera.aprobada_at = null;
        payloadCabecera.aprobada_por = null;
        payloadCabecera.motivo_rechazo = null;
      } else if (!esRRHH) {
        payloadCabecera.estado = estado === "borrador" ? "borrador" : "pendiente_aprobacion";
        payloadCabecera.aprobada_at = null;
        payloadCabecera.aprobada_por = null;
        payloadCabecera.motivo_rechazo = null;
      }

      let planId = planActual?.id ?? null;
      if (planId) {
        const { error } = await supabase
          .from("planificacion_semanal")
          .update(payloadCabecera)
          .eq("id", planId);
        if (error) throw error;
      } else {
        // Los índices únicos son parciales, así que ON CONFLICT no aplica: buscamos y luego insert/update
        let q = supabase
          .from("planificacion_semanal")
          .select("id")
          .eq("fecha_inicio_semana", inicio);
        q = payloadCabecera.sucursal_id
          ? q.eq("sucursal_id", payloadCabecera.sucursal_id)
          : q.is("sucursal_id", null);
        const { data: existente, error: findError } = await q.maybeSingle();
        if (findError) throw findError;

        if (existente?.id) {
          const { error } = await supabase
            .from("planificacion_semanal")
            .update(payloadCabecera)
            .eq("id", existente.id);
          if (error) throw error;
          planId = existente.id;
        } else {
          const { data, error } = await supabase
            .from("planificacion_semanal")
            .insert(payloadCabecera)
            .select("id")
            .single();
          if (error) throw error;
          planId = data.id;
        }

      }

      await supabase.from("planificacion_semanal_detalle").delete().eq("planificacion_id", planId);

      const filas: any[] = [];
      for (const f of dias) {
        const dia = datos[f];
        if (!dia) continue;
        const dow = new Date(`${f}T00:00:00`).getDay();
        for (const fila of dia.filas) {
          filas.push({
            planificacion_id: planId,
            empleado_id: fila.empleado_id,
            sucursal_id: fila.sucursal_id,
            dia_semana: dow,
            fecha: f,
            hora_entrada: fila.entrada,
            hora_salida: fila.salida,
            pausa_minutos: fila.pausa || 0,
            horas_extras: fila.extras || 0,
            valor_hora_extra: dia.valorHoraExtra || null,
            notas: null,
          });
        }
      }

      if (filas.length) {
        const { error } = await supabase.from("planificacion_semanal_detalle").insert(filas);
        if (error) throw error;
      }

      toast({
        title: "Planificación guardada",
        description: `${filas.length} tramos en la semana del ${fechaCorta(inicio)}`,
      });
      setSaveOpen(false);
      await cargarPlanes();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error al guardar", description: e.message, variant: "destructive" });
    } finally {
      setGuardando(false);
    }
  };

  /** Cambia el estado de aprobación de la semana guardada (vía funciones seguras) */
  const resolverAprobacion = async (
    nuevo: "pendiente_aprobacion" | "aprobada" | "rechazada",
    motivo?: string
  ) => {
    if (!planActual) return;
    setAprobando(true);
    try {
      if (nuevo === "pendiente_aprobacion") {
        const { error } = await (supabase as any).rpc("enviar_planificacion_a_validacion", {
          p_planificacion_id: planActual.id,
        });
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).rpc("resolver_planificacion", {
          p_planificacion_id: planActual.id,
          p_aprobar: nuevo === "aprobada",
          p_motivo: motivo ?? null,
        });
        if (error) throw error;
      }


      toast({
        title:
          nuevo === "aprobada"
            ? "Planificación aprobada"
            : nuevo === "rechazada"
            ? "Planificación rechazada"
            : "Enviada a RRHH",
        description: `Semana del ${fechaCorta(inicio)}`,
      });
      await cargarPlanes();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setAprobando(false);
    }
  };

  /* ------------------------- Cargar / copiar ------------------------- */

  const cargarPlan = async (planId: string, semanaDestino: string) => {
    try {
      const { data, error } = await supabase
        .from("planificacion_semanal_detalle")
        .select(
          "empleado_id, sucursal_id, dia_semana, fecha, hora_entrada, hora_salida, pausa_minutos, horas_extras, empleados(nombre, apellido), sucursales(nombre)"
        )
        .eq("planificacion_id", planId);
      if (error) throw error;

      const porDia: Record<string, any[]> = {};
      for (const r of (data || []) as any[]) {
        const offset = (r.dia_semana === 0 ? 7 : r.dia_semana) - 1;
        const fecha = sumarDias(semanaDestino, offset);
        (porDia[fecha] ??= []).push(r);
      }

      for (let i = 0; i < 7; i++) {
        const fecha = sumarDias(semanaDestino, i);
        const rows = porDia[fecha] || [];
        const agregados = rows.map((r) => ({
          id: nuevoTramoId(),
          empleado_id: r.empleado_id,
          nombre: r.empleados ? `${r.empleados.apellido}, ${r.empleados.nombre}` : "Empleado",
          sucursal_id: r.sucursal_id,
          sucursal_nombre: r.sucursales?.nombre || "Sin sucursal",
          entrada: String(r.hora_entrada).slice(0, 5),
          salida: String(r.hora_salida).slice(0, 5),
          pausa: r.pausa_minutos || 0,
        }));
        const extras: Record<string, number> = {};
        agregados.forEach((a, idx) => {
          const h = Number(rows[idx].horas_extras || 0);
          if (h > 0) extras[`tramo-${a.id}`] = h;
        });
        escribirBorradorDia(fecha, {
          ediciones: {},
          agregados,
          eliminados: [],
          extras,
          soloAgregados: true,
        });
      }

      setInicio(semanaDestino);
      setDatos({});
      setRotaciones([]);
      setRemountKey((k) => k + 1);
      toast({ title: "Planificación cargada", description: `Semana del ${fechaCorta(semanaDestino)}` });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error al cargar", description: e.message, variant: "destructive" });
    }
  };

  const limpiarSemana = () => {
    for (const f of dias) escribirBorradorDia(f, null);
    setDatos({});
    setRotaciones([]);
    setRemountKey((k) => k + 1);
    toast({ title: "Semana restablecida", description: "Se volvieron a cargar los turnos asignados" });
  };

  /** Copia los tramos de un día a otros días de la semana */
  const copiarDia = () => {
    const origen = dias[copiaOrigen];
    const filas = datos[origen]?.filas ?? [];
    if (!filas.length) {
      toast({
        title: "Sin datos para copiar",
        description: `El ${DIA_CORTO[copiaOrigen]} ${fechaCorta(origen)} no tiene tramos.`,
        variant: "destructive",
      });
      return;
    }
    const destinos = copiaDestinos.filter((i) => i !== copiaOrigen);
    if (!destinos.length) {
      toast({ title: "Elegí al menos un día destino", variant: "destructive" });
      return;
    }

    for (const idx of destinos) {
      const fecha = dias[idx];
      const agregados = filas.map((f) => ({
        id: nuevoTramoId(),
        empleado_id: f.empleado_id,
        nombre: f.nombre,
        sucursal_id: f.sucursal_id,
        sucursal_nombre: f.sucursal_nombre,
        entrada: f.entrada,
        salida: f.salida,
        pausa: f.pausa || 0,
      }));
      const extras: Record<string, number> = {};
      agregados.forEach((a, i) => {
        const h = Number(filas[i].extras || 0);
        if (h > 0) extras[`tramo-${a.id}`] = h;
      });
      escribirBorradorDia(fecha, {
        ediciones: {},
        agregados,
        eliminados: [],
        extras,
        soloAgregados: true,
      });
    }

    setDatos((prev) => {
      const next = { ...prev };
      for (const idx of destinos) delete next[dias[idx]];
      return next;
    });
    setRemountKey((k) => k + 1);
    setCopiaOpen(false);
    toast({
      title: "Día copiado",
      description: `${filas.length} tramos del ${DIA_CORTO[copiaOrigen]} a: ${destinos
        .map((i) => DIA_CORTO[i])
        .join(", ")}`,
    });
  };

  /* ------------------------- Rotar empleados ------------------------- */

  const filasPorDia: Record<string, FilaRotacion[]> = useMemo(() => {
    const out: Record<string, FilaRotacion[]> = {};
    for (const f of dias) {
      out[f] = (datos[f]?.filas ?? []).map((x) => ({
        empleado_id: x.empleado_id,
        nombre: x.nombre,
        sucursal_id: x.sucursal_id,
        sucursal_nombre: x.sucursal_nombre,
        entrada: x.entrada,
        salida: x.salida,
        pausa: x.pausa || 0,
        extras: x.extras || 0,
      }));
    }
    return out;
  }, [dias, datos]);

  const rotarEmpleados = ({
    empleadoA,
    empleadoB,
    modo,
    diasIdx,
  }: {
    empleadoA: string;
    empleadoB: string;
    modo: ModoRotacion;
    diasIdx: number[];
  }) => {
    let diasTocados = 0;
    let nombreA = "";
    let nombreB = "";

    for (const idx of diasIdx) {
      const fecha = dias[idx];
      const filas = filasPorDia[fecha] ?? [];
      const refA = filas.find((f) => f.empleado_id === empleadoA);
      const refB = filas.find((f) => f.empleado_id === empleadoB);
      if (!refA && !refB) continue;
      if (refA) nombreA = refA.nombre;
      if (refB) nombreB = refB.nombre;

      const nuevas = filas.map((f) => {
        const ref = f.empleado_id === empleadoA ? refB : f.empleado_id === empleadoB ? refA : null;
        if (!ref) return f;
        return {
          ...f,
          sucursal_id: ref.sucursal_id,
          sucursal_nombre: ref.sucursal_nombre,
          ...(modo === "puesto"
            ? { entrada: ref.entrada, salida: ref.salida, pausa: ref.pausa, extras: ref.extras }
            : {}),
        };
      });

      const agregados = nuevas.map((f) => ({
        id: nuevoTramoId(),
        empleado_id: f.empleado_id,
        nombre: f.nombre,
        sucursal_id: f.sucursal_id,
        sucursal_nombre: f.sucursal_nombre,
        entrada: f.entrada,
        salida: f.salida,
        pausa: f.pausa || 0,
      }));
      const extras: Record<string, number> = {};
      agregados.forEach((a, i) => {
        const h = Number(nuevas[i].extras || 0);
        if (h > 0) extras[`tramo-${a.id}`] = h;
      });

      escribirBorradorDia(fecha, {
        ediciones: {},
        agregados,
        eliminados: [],
        extras,
        soloAgregados: true,
      });
      diasTocados++;
    }

    if (!diasTocados) {
      toast({
        title: "Sin cambios",
        description: "Los empleados elegidos no tienen tramos en los días seleccionados.",
        variant: "destructive",
      });
      return;
    }

    setDatos({});
    setRemountKey((k) => k + 1);
    const etiqueta = `${nombreA || "Empleado A"} ⇄ ${nombreB || "Empleado B"}`;
    setRotaciones((prev) => [...new Set([...prev, etiqueta])]);
    toast({
      title: "Rotación aplicada",
      description: `${etiqueta} en ${diasTocados} día(s). Guardá la semana para dejarla registrada.`,
    });
  };


  const eliminarPlan = async (planId: string) => {
    if (!confirm("¿Eliminar esta planificación guardada?")) return;
    const { error } = await supabase.from("planificacion_semanal").delete().eq("id", planId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Planificación eliminada" });
    await cargarPlanes();
  };

  /* ------------------------- Aplicar / revertir ------------------------- */

  const aplicar = async () => {
    if (!planActual) return;
    const total = dias.reduce((a, f) => a + (datos[f]?.filas.length ?? 0), 0);
    if (
      !confirm(
        `Se van a aplicar ${total} tramos como cambios de horario para la semana del ${fechaCorta(inicio)}. ` +
          "No se modifican los turnos permanentes. ¿Continuar?"
      )
    )
      return;
    const { data, error } = await (supabase as any).rpc("aplicar_planificacion_semanal", {
      _planificacion_id: planActual.id,
    });
    if (error) {
      toast({ title: "Error al aplicar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Horarios aplicados", description: `${data ?? 0} cambios de horario generados` });
    await cargarPlanes();
  };

  const revertir = async () => {
    if (!planActual) return;
    if (!confirm("¿Quitar los horarios aplicados de esta semana?")) return;
    const { data, error } = await (supabase as any).rpc("revertir_planificacion_semanal", {
      _planificacion_id: planActual.id,
    });
    if (error) {
      toast({ title: "Error al revertir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Aplicación revertida", description: `${data ?? 0} cambios eliminados` });
    await cargarPlanes();
  };

  const abrirGuardar = () => {
    setNombre(planActual?.nombre || `Semana del ${fechaCorta(inicio)}`);
    setNotas(planActual?.notas || "");
    setEstado(planActual?.estado || "borrador");
    setSaveOpen(true);
  };

  const filtrosTexto =
    `Semana ${fechaCorta(inicio)} al ${fechaCorta(dias[6])}` +
    (rotaciones.length ? ` · Rotaciones: ${rotaciones.join("; ")}` : "");

  /** En modo encargado la semana se bloquea cuando ya fue enviada o aprobada */
  const bloqueadaEncargado =
    modoEncargado &&
    (planActual?.estado === "pendiente_aprobacion" || planActual?.estado === "aprobada");


  return (
    <div className="space-y-4">
      {esRRHH && !modoEncargado && <BandejaPlanificacionesRRHH onCambio={cargarPlanes} />}

      {/* Barra de la semana */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => cambiarSemana(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <Label className="text-xs">Semana (lunes)</Label>
                <Input
                  type="date"
                  value={inicio}
                  onChange={(e) => e.target.value && setInicio(lunesDe(e.target.value))}
                  className="w-[170px]"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => cambiarSemana(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setInicio(lunesDe(iso(new Date())))}>
                Semana actual
              </Button>
            </div>

            <div className="min-w-[240px]">
              <Label className="text-xs">Copiar de una semana guardada</Label>
              <div className="flex gap-1">
                <Select value={copiarDe} onValueChange={setCopiarDe}>
                  <SelectTrigger>
                    <SelectValue placeholder="— Elegir —" />
                  </SelectTrigger>
                  <SelectContent>
                    {planes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre || `Semana ${fechaCorta(p.fecha_inicio_semana)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  title="Copiar a esta semana"
                  disabled={!copiarDe}
                  onClick={() => copiarDe && cargarPlan(copiarDe, inicio)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCopiaOrigen(diaSel);
                  setCopiaDestinos([]);
                  setCopiaOpen(true);
                }}
              >
                <CopyPlus className="h-4 w-4 mr-2" />
                Copiar día
              </Button>
              <Button
                variant="outline"
                onClick={() => setRotarOpen(true)}
                disabled={bloqueadaEncargado}
              >
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Rotar empleados
              </Button>
              <Button variant="outline" onClick={limpiarSemana}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restablecer semana
              </Button>
              <Button onClick={abrirGuardar} disabled={guardando || bloqueadaEncargado}>
                <Save className="h-4 w-4 mr-2" />
                {planActual ? "Actualizar semana" : "Guardar semana"}
              </Button>
              {esRRHH && planActual?.estado === "pendiente_aprobacion" && (
                <>
                  <Button
                    variant="default"
                    disabled={aprobando}
                    onClick={() => resolverAprobacion("aprobada")}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Aprobar semana
                  </Button>
                  <Button
                    variant="outline"
                    disabled={aprobando}
                    onClick={() => {
                      const motivo = window.prompt("Motivo del rechazo (opcional)") ?? undefined;
                      resolverAprobacion("rechazada", motivo);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rechazar
                  </Button>
                </>
              )}
              {!esRRHH && planActual && planActual.estado !== "pendiente_aprobacion" && planActual.estado !== "aprobada" && (
                <Button variant="secondary" disabled={aprobando} onClick={() => resolverAprobacion("pendiente_aprobacion")}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar a validación de RRHH
                </Button>
              )}

              {esRRHH &&
                planActual &&
                (planActual.aplicada_at ? (
                  <Button variant="outline" onClick={revertir}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Quitar aplicación
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={aplicar}
                    disabled={planActual.estado !== "aprobada"}
                    title={
                      planActual.estado !== "aprobada"
                        ? "La planificación debe estar aprobada por RRHH"
                        : "Aplicar horarios"
                    }
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Aplicar horarios
                  </Button>
                ))}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar semana
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      exportSemanaXLSX(inicio, diasExport, filtrosTexto, esRRHH ? valorHoraExtra : 0, planActual?.nombre || "")
                    }
                  >
                    Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      exportSemanaPDF(inicio, diasExport, filtrosTexto, esRRHH ? valorHoraExtra : 0, planActual?.nombre || "")
                    }
                  >
                    PDF completo
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      exportSemanaResumenPDF(inicio, diasExport, filtrosTexto, planActual?.nombre || "")
                    }
                  >
                    PDF resumen (cobertura + horarios)
                  </DropdownMenuItem>

                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {dias.map((f, i) => {
              const d = datos[f];
              const activo = i === diaSel;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setDiaSel(i)}
                  className={`rounded-md border px-3 py-2 text-left transition-colors ${
                    activo ? "border-primary bg-primary/10" : "hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{DIA_CORTO[i]}</span>
                    <span className="text-xs text-muted-foreground">{fechaCorta(f)}</span>
                  </div>
                  <div className="mt-1 flex gap-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {new Set((d?.filas ?? []).map((x) => x.empleado_id)).size} emp.
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {(d?.totalHoras ?? 0).toFixed(1)} h
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Estado de la semana */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
        <Info className="h-4 w-4 shrink-0" />
        {planActual ? (
          <>
            <span className="font-medium">{planActual.nombre || "Semana guardada"}</span>
            <Badge variant="outline">{estadoTexto(planActual.estado)}</Badge>
            {planActual.aplicada_at ? (
              <Badge className="bg-green-600 text-white hover:bg-green-600">Aplicada</Badge>
            ) : planActual.estado === "aprobada" ? (
              <span>Aprobada por RRHH — lista para aplicar a los horarios reales.</span>
            ) : planActual.estado === "pendiente_aprobacion" ? (
              <span>Enviada a RRHH: se aplica solo cuando RRHH la aprueba.</span>
            ) : planActual.estado === "rechazada" ? (
              <span>Rechazada por RRHH{planActual.motivo_rechazo ? `: ${planActual.motivo_rechazo}` : ""} — ajustá y volvé a enviarla.</span>
            ) : (
              <span>Borrador — enviala a RRHH para que la apruebe.</span>
            )}
          </>
        ) : (
          <span>
            Semana sin guardar — armá cada día y usá “Guardar semana”. Aplicar horarios es opcional.
          </span>
        )}
      </div>

      {/* Resumen semanal */}
      <div className={`grid gap-3 ${esRRHH ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Empleados en la semana</p>
            <p className="text-2xl font-bold">{empleadosSemana}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Horas programadas</p>
            <p className="text-2xl font-bold">{totalHoras.toFixed(1)} h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Horas extras</p>
            <p className="text-2xl font-bold">{totalExtras.toFixed(1)} h</p>
          </CardContent>
        </Card>
        {esRRHH && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Costo horas extras</p>
              <p className="text-2xl font-bold">
                $ {(totalExtras * valorHoraExtra).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Día seleccionado (los 7 quedan montados para poder guardar y exportar la semana completa) */}
      {dias.map((f, i) => (
        <div key={`${remountKey}-${f}`} className={i === diaSel ? "" : "hidden"}>
          <VistaDiaPlanificacion
            fecha={f}
            modoSemana
            onDatosChange={registrarDatos}
            sucursalFija={modoEncargado ? sucursalId : undefined}
          />

        </div>
      ))}

      {/* Planificaciones guardadas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            Planificaciones guardadas
          </CardTitle>
          <CardDescription>Cada semana se guarda con sus propios horarios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {planes.length === 0 && (
            <p className="text-sm text-muted-foreground">Todavía no hay semanas guardadas.</p>
          )}
          {planes.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <span className="font-medium">{p.nombre || "Semana"}</span>
              <Badge variant="outline">{fechaCorta(p.fecha_inicio_semana)}</Badge>
              <Badge variant="secondary">{estadoTexto(p.estado)}</Badge>
              {p.aplicada_at && (
                <Badge className="bg-green-600 text-white hover:bg-green-600">Aplicada</Badge>
              )}
              {p.notas && <span className="text-xs text-muted-foreground">{p.notas}</span>}
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => cargarPlan(p.id, p.fecha_inicio_semana)}
                >
                  Abrir
                </Button>
                <Button size="sm" variant="outline" onClick={() => cargarPlan(p.id, inicio)}>
                  Copiar a semana actual
                </Button>
                <Button size="sm" variant="ghost" onClick={() => eliminarPlan(p.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Guardar */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {planActual ? "Actualizar planificación" : "Guardar planificación semanal"}
            </DialogTitle>
            <DialogDescription>
              Definí nombre, estado y notas para la planificación de la semana del {fechaCorta(inicio)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            {!modoEncargado && (
              <div>
                <Label>Estado</Label>
                <Select value={estado} onValueChange={setEstado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="pendiente_aprobacion">Enviar a aprobación de RRHH</SelectItem>
                    {esRRHH && <SelectItem value="aprobada">Aprobada por RRHH</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Notas</Label>
              <Textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej. cubre vacaciones de Tomás y licencia de Analía"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Se guardan {dias.reduce((a, f) => a + (datos[f]?.filas.length ?? 0), 0)} tramos de la semana
              del {fechaCorta(inicio)} al {fechaCorta(dias[6])}.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copiar día */}
      <Dialog open={copiaOpen} onOpenChange={setCopiaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copiar día</DialogTitle>
            <DialogDescription>
              Replicá los tramos de un día en otros días de la semana (ej. repetir lunes en miércoles y viernes).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Día de origen</Label>
              <Select value={String(copiaOrigen)} onValueChange={(v) => setCopiaOrigen(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dias.map((f, i) => (
                    <SelectItem key={f} value={String(i)}>
                      {DIA_CORTO[i]} {fechaCorta(f)} · {(datos[f]?.filas.length ?? 0)} tramos
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Días destino</Label>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {dias.map((f, i) => {
                  const deshabilitado = i === copiaOrigen;
                  const sel = copiaDestinos.includes(i);
                  return (
                    <button
                      key={f}
                      type="button"
                      disabled={deshabilitado}
                      onClick={() =>
                        setCopiaDestinos((prev) =>
                          prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
                        )
                      }
                      className={`rounded-md border px-2 py-2 text-left text-sm transition-colors ${
                        deshabilitado
                          ? "opacity-40 cursor-not-allowed"
                          : sel
                          ? "border-primary bg-primary/10"
                          : "hover:bg-muted/60"
                      }`}
                    >
                      <div className="font-medium">{DIA_CORTO[i]}</div>
                      <div className="text-[11px] text-muted-foreground">{fechaCorta(f)}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Los días destino se reemplazan por los tramos copiados (no se suman a los turnos asignados).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopiaOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={copiarDia} disabled={!copiaDestinos.length}>
              <CopyPlus className="h-4 w-4 mr-2" />
              Copiar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotar empleados entre sucursales */}
      <RotarEmpleadosDialog
        key={`rotar-${inicio}`}
        open={rotarOpen}
        onOpenChange={setRotarOpen}
        dias={dias}
        diasCorto={DIA_CORTO}
        filasPorDia={filasPorDia}
        onAplicar={rotarEmpleados}
      />
    </div>
  );
}
