import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, UserX, Clock, Timer, Banknote, TrendingUp, FileWarning, CalendarClock, ClipboardList, Hourglass,
} from "lucide-react";
import { rolConPreview } from "@/lib/rolEfectivo";

interface Sucursal { id: string; nombre: string }

interface Metricas {
  empleadosActivos: number;
  datosIncompletos: number;
  indiceAusentismo: number | null;
  llegadasTarde: number;
  pausasExcedidas: number;
  horasTrabajadas: number;
  horasExtras: number;
  facturacion: number;
  tickets: number;
  vacacionesPendientes: number;
}

const TODAS = "todas";

export default function Indicadores() {
  const navigate = useNavigate();
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalId, setSucursalId] = useState<string>(TODAS);
  const [mes, setMes] = useState<string>(() => {
    const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 7); // YYYY-MM
  });
  const [m, setM] = useState<Metricas | null>(null);
  const [loading, setLoading] = useState(true);

  // Guardia: solo admin_rrhh (respeta "Ver como")
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: emp } = await supabase.from("empleados").select("rol, activo").eq("user_id", user.id).maybeSingle();
      if (!emp?.activo || rolConPreview(emp.rol) !== "admin_rrhh") {
        navigate("/dashboard");
        return;
      }
      setAutorizado(true);
    })();
  }, [navigate]);

  useEffect(() => {
    supabase.from("sucursales").select("id, nombre").eq("activa", true).order("nombre")
      .then(({ data }) => setSucursales((data as Sucursal[]) ?? []));
  }, []);

  const rango = useMemo(() => {
    const [y, mo] = mes.split("-").map(Number);
    const desde = `${mes}-01`;
    const hasta = new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
    return { desde, hasta };
  }, [mes]);

  useEffect(() => {
    if (!autorizado) return;
    (async () => {
      setLoading(true);
      const { desde, hasta } = rango;
      const filtroSuc = sucursalId !== TODAS ? sucursalId : null;

      const [
        empRes,
        ausRes,
        tardeRes,
        pausasRes,
        horasRes,
        factRes,
        vacRes,
      ] = await Promise.all([
        supabase.from("empleados").select("id, dni, cuil, sucursal_id").eq("activo", true),
        supabase.rpc("get_indice_ausentismo" as any, {
          p_desde: desde,
          p_hasta: hasta,
          p_sucursales: filtroSuc ? [filtroSuc] : null,
          p_excluir_vacaciones: true,
        } as any),
        supabase.from("fichajes_tardios").select("id", { count: "exact", head: true })
          .gte("fecha_fichaje", desde).lte("fecha_fichaje", hasta),
        supabase.from("fichajes_pausas_excedidas").select("id", { count: "exact", head: true })
          .gte("fecha_fichaje", desde).lte("fecha_fichaje", hasta),
        supabase.from("horas_trabajadas_registro").select("horas_trabajadas, horas_extras_50, horas_extras_100, empleado_id")
          .gte("fecha", desde).lte("fecha", hasta),
        supabase.from("facturacion_sucursal").select("total, cantidad_tickets, sucursal_id")
          .gte("fecha", desde).lte("fecha", hasta),
        supabase.from("solicitudes_vacaciones").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
      ]);

      const empleados = (empRes.data ?? []) as { id: string; dni: string | null; cuil: string | null; sucursal_id: string | null }[];
      const empFiltrados = filtroSuc ? empleados.filter((e) => e.sucursal_id === filtroSuc) : empleados;
      const empIds = new Set(empFiltrados.map((e) => e.id));

      // Ausentismo: % de ausentes sobre esperados
      const registros = (ausRes.data ?? []) as { es_ausente: boolean; es_esperado: boolean; empleado_id: string }[];
      const regFiltrados = filtroSuc ? registros.filter((r) => empIds.has(r.empleado_id)) : registros;
      const esperados = regFiltrados.filter((r) => r.es_esperado).length;
      const ausentes = regFiltrados.filter((r) => r.es_ausente).length;
      const indice = esperados > 0 ? (ausentes / esperados) * 100 : null;

      const horas = (horasRes.data ?? []).filter((h) => empIds.has(h.empleado_id));
      const hTrab = horas.reduce((a, h) => a + (h.horas_trabajadas ?? 0), 0);
      const hExt = horas.reduce((a, h) => a + (h.horas_extras_50 ?? 0) + (h.horas_extras_100 ?? 0), 0);

      const fact = (factRes.data ?? []).filter((f) => !filtroSuc || f.sucursal_id === filtroSuc);
      const factTotal = fact.reduce((a, f) => a + (f.total ?? 0), 0);
      const tickets = fact.reduce((a, f) => a + (f.cantidad_tickets ?? 0), 0);

      setM({
        empleadosActivos: empFiltrados.length,
        datosIncompletos: empFiltrados.filter((e) => !e.dni || !e.cuil).length,
        indiceAusentismo: indice,
        llegadasTarde: tardeRes.count ?? 0,
        pausasExcedidas: pausasRes.count ?? 0,
        horasTrabajadas: Math.round(hTrab * 10) / 10,
        horasExtras: Math.round(hExt * 10) / 10,
        facturacion: factTotal,
        tickets,
        vacacionesPendientes: vacRes.count ?? 0,
      });
      setLoading(false);
    })();
  }, [autorizado, rango, sucursalId]);

  if (autorizado === null) return <div className="p-6"><Skeleton className="h-40 w-full" /></div>;

  const formatMoney = (v: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(v);

  const tarjetas: {
    titulo: string; valor: string; detalle?: string; icono: typeof Users; enlace: string; alerta?: boolean;
  }[] = m ? [
    { titulo: "Empleados activos", valor: String(m.empleadosActivos), icono: Users, enlace: "/rrhh/nomina" },
    { titulo: "Datos incompletos", valor: String(m.datosIncompletos), detalle: "Sin DNI o CUIL", icono: FileWarning, enlace: "/rrhh/nomina", alerta: m.datosIncompletos > 0 },
    { titulo: "Ausentismo del mes", valor: m.indiceAusentismo === null ? "Sin datos" : `${m.indiceAusentismo.toFixed(1)}%`, icono: UserX, enlace: "/rrhh/indice-ausentismo" },
    { titulo: "Llegadas tarde", valor: String(m.llegadasTarde), icono: Clock, enlace: "/fichero#estadisticas", alerta: m.llegadasTarde > 0 },
    { titulo: "Pausas excedidas", valor: String(m.pausasExcedidas), icono: Timer, enlace: "/fichero#estadisticas", alerta: m.pausasExcedidas > 0 },
    { titulo: "Horas trabajadas", valor: m.horasTrabajadas.toLocaleString("es-AR"), icono: Hourglass, enlace: "/fichero#informe" },
    { titulo: "Horas extras", valor: m.horasExtras.toLocaleString("es-AR"), icono: Hourglass, enlace: "/rrhh/horas-extras" },
    { titulo: "Facturación", valor: m.facturacion > 0 ? formatMoney(m.facturacion) : "Sin datos", detalle: m.tickets > 0 ? `${m.tickets.toLocaleString("es-AR")} tickets` : undefined, icono: Banknote, enlace: "/rrhh/rentabilidad" },
    { titulo: "Vacaciones por aprobar", valor: String(m.vacacionesPendientes), icono: CalendarClock, enlace: "/rrhh/vacaciones", alerta: m.vacacionesPendientes > 0 },
  ] : [];

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <TrendingUp className="h-6 w-6 text-primary" /> Tablero de indicadores
          </h1>
          <p className="text-sm text-muted-foreground">Resumen del mes por sucursal. Tocá una tarjeta para ver el detalle.</p>
        </div>
        <div className="flex gap-2">
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
                d.setMonth(d.getMonth() - i);
                const v = d.toISOString().slice(0, 7);
                return <SelectItem key={v} value={v}>{d.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}</SelectItem>;
              })}
            </SelectContent>
          </Select>
          <Select value={sucursalId} onValueChange={setSucursalId}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Sucursal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todas las sucursales</SelectItem>
              {sucursales.map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading || !m ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tarjetas.map((t) => (
            <Card
              key={t.titulo}
              className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/40"
              onClick={() => navigate(t.enlace)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.titulo}</CardTitle>
                <t.icono className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{t.valor}</span>
                  {t.alerta && <Badge variant="destructive" className="text-[10px]">Atención</Badge>}
                </div>
                {t.detalle && <p className="mt-1 text-xs text-muted-foreground">{t.detalle}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
