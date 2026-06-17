import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Save, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, addDays, startOfWeek, subWeeks } from "date-fns";
import { es } from "date-fns/locale";

const SIN_ASIGNAR = "__none__";

interface Turno {
  id: string;
  numero_turno: number;
  hora_desde: string;
  hora_hasta: string;
  permite_gerente: boolean;
  sucursal_id: string;
}

interface Sucursal { id: string; nombre: string; }
interface Empleado { id: string; nombre: string; apellido: string; puesto_nombre?: string | null; }

function getMonday(d: Date) {
  return startOfWeek(d, { weekStartsOn: 1 });
}

export default function PlanillaDescansos() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalId, setSucursalId] = useState<string>("");
  const [semanaLunes, setSemanaLunes] = useState<Date>(getMonday(new Date()));
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  // turno_id -> empleado_id ('' significa sin asignar)
  const [asignaciones, setAsignaciones] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const semanaIni = format(semanaLunes, "yyyy-MM-dd");
  const semanaFin = format(addDays(semanaLunes, 6), "yyyy-MM-dd");

  // Cargar sucursales con turnos
  useEffect(() => {
    (async () => {
      const { data: t } = await supabase
        .from("planilla_descansos_turnos")
        .select("sucursal_id, sucursales:sucursal_id(id, nombre)")
        .eq("activo", true);
      const map = new Map<string, Sucursal>();
      (t || []).forEach((row: any) => {
        if (row.sucursales) map.set(row.sucursales.id, row.sucursales);
      });
      const arr = Array.from(map.values());
      setSucursales(arr);
      if (arr.length && !sucursalId) setSucursalId(arr[0].id);
    })();
  }, []);

  // Cargar turnos + empleados + asignaciones de la semana
  useEffect(() => {
    if (!sucursalId) return;
    (async () => {
      setLoading(true);
      const [{ data: turnosData }, { data: empData }, { data: asigData }] = await Promise.all([
        supabase.from("planilla_descansos_turnos")
          .select("*").eq("sucursal_id", sucursalId).eq("activo", true)
          .order("numero_turno"),
        supabase.from("empleados")
          .select("id, nombre, apellido, puestos:puesto_id(nombre)")
          .eq("sucursal_id", sucursalId).eq("activo", true)
          .order("apellido"),
        supabase.from("planilla_descansos_asignaciones")
          .select("turno_id, empleado_id")
          .eq("sucursal_id", sucursalId).eq("semana_inicio", semanaIni).eq("activo", true),
      ]);
      setTurnos((turnosData || []) as Turno[]);
      setEmpleados(((empData as any[]) || []).map((e) => ({
        id: e.id, nombre: e.nombre, apellido: e.apellido,
        puesto_nombre: e.puestos?.nombre ?? null,
      })));
      const map: Record<string, string> = {};
      (asigData || []).forEach((a: any) => { map[a.turno_id] = a.empleado_id; });
      setAsignaciones(map);
      setLoading(false);
    })();
  }, [sucursalId, semanaIni]);

  const empleadoUsado = (empleadoId: string, turnoActualId?: string) => {
    return Object.entries(asignaciones).some(
      ([tId, eId]) => eId === empleadoId && tId !== turnoActualId
    );
  };

  const empleadosPorTurno = useMemo(() => {
    return (turno: Turno) =>
      empleados.filter((e) => {
        if (!turno.permite_gerente) {
          const p = (e.puesto_nombre || "").toLowerCase();
          if (p.includes("gerente")) return false;
        }
        return true;
      });
  }, [empleados]);

  const setAsignacion = (turnoId: string, empleadoId: string) => {
    const real = empleadoId === SIN_ASIGNAR ? "" : empleadoId;
    if (real && empleadoUsado(real, turnoId)) {
      toast({ title: "Empleado ya asignado", description: "Quitalo del otro turno antes de asignarlo acá.", variant: "destructive" });
      return;
    }
    setAsignaciones((p) => ({ ...p, [turnoId]: real }));
  };

  const copiarSemanaAnterior = async () => {
    const lunPrev = format(subWeeks(semanaLunes, 1), "yyyy-MM-dd");
    const { data } = await supabase.from("planilla_descansos_asignaciones")
      .select("turno_id, empleado_id")
      .eq("sucursal_id", sucursalId).eq("semana_inicio", lunPrev).eq("activo", true);
    if (!data || !data.length) {
      toast({ title: "Sin datos", description: "La semana anterior no tiene asignaciones." });
      return;
    }
    const map: Record<string, string> = {};
    data.forEach((a: any) => { map[a.turno_id] = a.empleado_id; });
    setAsignaciones(map);
    toast({ title: "Cargado", description: "Asignaciones de la semana anterior cargadas (sin guardar)." });
  };

  const guardar = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // borrar asignaciones existentes y reinsertar
      await supabase.from("planilla_descansos_asignaciones")
        .delete().eq("sucursal_id", sucursalId).eq("semana_inicio", semanaIni);

      const rows = Object.entries(asignaciones)
        .filter(([, empId]) => !!empId)
        .map(([turnoId, empleadoId]) => ({
          turno_id: turnoId,
          empleado_id: empleadoId,
          sucursal_id: sucursalId,
          semana_inicio: semanaIni,
          semana_fin: semanaFin,
          activo: true,
          created_by: user?.id ?? null,
        }));
      if (rows.length) {
        const { error } = await supabase.from("planilla_descansos_asignaciones").insert(rows);
        if (error) throw error;
      }
      toast({ title: "Guardado", description: `Planilla de la semana del ${format(semanaLunes, "dd/MM/yyyy")} actualizada.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Planilla de Descansos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Sucursal</label>
              <Select value={sucursalId} onValueChange={setSucursalId}>
                <SelectTrigger className="w-64"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {sucursales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Semana</label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setSemanaLunes((d) => addDays(d, -7))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-[220px] text-center text-sm">
                  {format(semanaLunes, "dd MMM", { locale: es })} – {format(addDays(semanaLunes, 6), "dd MMM yyyy", { locale: es })}
                </div>
                <Button variant="outline" size="icon" onClick={() => setSemanaLunes((d) => addDays(d, 7))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button variant="outline" onClick={copiarSemanaAnterior}>
              <Copy className="h-4 w-4 mr-2" /> Copiar semana anterior
            </Button>
            <Button onClick={guardar} disabled={saving}>
              <Save className="h-4 w-4 mr-2" /> {saving ? "Guardando..." : "Guardar planilla"}
            </Button>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Cargando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Turno</TableHead>
                  <TableHead className="w-32">Desde</TableHead>
                  <TableHead className="w-32">Hasta</TableHead>
                  <TableHead>Empleado asignado</TableHead>
                  <TableHead className="w-48">Observaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turnos.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-semibold">{t.numero_turno}</TableCell>
                    <TableCell>{t.hora_desde.slice(0, 5)}</TableCell>
                    <TableCell>{t.hora_hasta.slice(0, 5)}</TableCell>
                    <TableCell>
                      <Select
                        value={asignaciones[t.id] || SIN_ASIGNAR}
                        onValueChange={(v) => setAsignacion(t.id, v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SIN_ASIGNAR}>— Sin asignar —</SelectItem>
                          {empleadosPorTurno(t).map((e) => {
                            const ocupado = empleadoUsado(e.id, t.id);
                            return (
                              <SelectItem key={e.id} value={e.id} disabled={ocupado}>
                                {e.apellido}, {e.nombre}
                                {e.puesto_nombre ? ` (${e.puesto_nombre})` : ""}
                                {ocupado ? " — ya asignado" : ""}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {!t.permite_gerente && (
                        <Badge variant="secondary">No gerente</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!turnos.length && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">
                    Esta sucursal no tiene turnos de descanso configurados.
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
