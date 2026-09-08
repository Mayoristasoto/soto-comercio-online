import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getArgentinaStartOfDay, getArgentinaEndOfDay, getArgentinaDateString, getArgentinaTimeString } from "@/lib/dateUtils";
import { format, endOfMonth, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Bar, BarChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart } from "recharts";
import { AlertTriangle, Clock, Upload } from "lucide-react";

interface Props {
  empleadoId: string;
  nombreCompleto: string;
}

interface FilaMetrica {
  fecha: string; // yyyy-MM-dd
  hora: number | null;
  chats: number;
  chats_sin_respuesta: number;
  primera_respuesta_min: number | null;
  resolucion_min: number | null;
}

interface DiaCruce {
  fecha: string;
  entrada: string | null;
  salida: string | null;
  minutos: number;
  chats: number;
  sinRespuesta: number;
  primeraRespuesta: number | null;
  resolucion: number | null;
}

const numero = (v: string | undefined): number | null => {
  if (v === undefined) return null;
  const limpio = v.trim().replace(",", ".").replace(/[^0-9.\-]/g, "");
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
};

const normalizar = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const ALIAS: Record<string, string> = {
  fecha: "fecha",
  dia: "fecha",
  date: "fecha",
  hora: "hora",
  franja: "hora",
  hour: "hora",
  chats: "chats",
  chatsatendidos: "chats",
  conversaciones: "chats",
  chatssinrespuesta: "sinRespuesta",
  sinrespuesta: "sinRespuesta",
  norespondidos: "sinRespuesta",
  tiempoprimerarespuesta: "primera",
  primerarespuesta: "primera",
  primerarespuestamin: "primera",
  trp: "primera",
  tiempoderesolucion: "resolucion",
  resolucion: "resolucion",
  resolucionmin: "resolucion",
  tiempoderesolucionmin: "resolucion",
};

const parsearFecha = (raw: string): string | null => {
  const v = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.substring(0, 10);
  const m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m) {
    const [, d, mo, y] = m;
    const anio = y.length === 2 ? `20${y}` : y;
    return `${anio}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
};

function parsearCSV(texto: string): FilaMetrica[] {
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lineas.length < 2) throw new Error("El archivo no tiene datos");
  const sep = (lineas[0].match(/;/g)?.length ?? 0) > (lineas[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const cabecera = lineas[0].split(sep).map((h) => ALIAS[normalizar(h)] ?? normalizar(h));
  const idx = (clave: string) => cabecera.indexOf(clave);
  if (idx("fecha") === -1) throw new Error("Falta la columna de fecha");

  const filas: FilaMetrica[] = [];
  for (const linea of lineas.slice(1)) {
    const celdas = linea.split(sep);
    const fecha = parsearFecha(celdas[idx("fecha")] ?? "");
    if (!fecha) continue;
    const horaRaw = idx("hora") >= 0 ? celdas[idx("hora")] : undefined;
    const hora = horaRaw ? numero(horaRaw.split(":")[0]) : null;
    filas.push({
      fecha,
      hora: hora === null ? null : Math.max(0, Math.min(23, Math.round(hora))),
      chats: Math.round(numero(idx("chats") >= 0 ? celdas[idx("chats")] : "0") ?? 0),
      chats_sin_respuesta: Math.round(numero(idx("sinRespuesta") >= 0 ? celdas[idx("sinRespuesta")] : "0") ?? 0),
      primera_respuesta_min: idx("primera") >= 0 ? numero(celdas[idx("primera")]) : null,
      resolucion_min: idx("resolucion") >= 0 ? numero(celdas[idx("resolucion")]) : null,
    });
  }
  if (filas.length === 0) throw new Error("No se pudo leer ninguna fila con fecha válida");
  return filas;
}

export default function CruceFichajeAtencion({ empleadoId, nombreCompleto }: Props) {
  const [mes, setMes] = useState(format(new Date(), "yyyy-MM"));
  const [metricas, setMetricas] = useState<FilaMetrica[]>([]);
  const [fichajes, setFichajes] = useState<{ tipo: string; timestamp_real: string }[]>([]);
  const [cargando, setCargando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const rango = useMemo(() => {
    const [y, m] = mes.split("-").map(Number);
    const desde = new Date(y, m - 1, 1);
    return { desde, hasta: endOfMonth(desde) };
  }, [mes]);

  const cargar = useCallback(async () => {
    if (!empleadoId) return;
    setCargando(true);
    const desdeStr = format(rango.desde, "yyyy-MM-dd");
    const hastaStr = format(rango.hasta, "yyyy-MM-dd");

    const [fich, met] = await Promise.all([
      supabase
        .from("fichajes")
        .select("tipo, timestamp_real")
        .eq("empleado_id", empleadoId)
        .gte("timestamp_real", getArgentinaStartOfDay(rango.desde))
        .lte("timestamp_real", getArgentinaEndOfDay(rango.hasta))
        .order("timestamp_real", { ascending: true }),
      supabase
        .from("atencion_metricas")
        .select("fecha, hora, chats, chats_sin_respuesta, primera_respuesta_min, resolucion_min")
        .eq("empleado_id", empleadoId)
        .gte("fecha", desdeStr)
        .lte("fecha", hastaStr)
        .order("fecha", { ascending: true }),
    ]);

    if (fich.error) toast.error("No se pudieron leer los fichajes");
    if (met.error) toast.error("No se pudieron leer las métricas de atención");

    setFichajes((fich.data as any[]) || []);
    setMetricas(
      ((met.data as any[]) || []).map((r) => ({
        fecha: r.fecha,
        hora: r.hora,
        chats: r.chats ?? 0,
        chats_sin_respuesta: r.chats_sin_respuesta ?? 0,
        primera_respuesta_min: r.primera_respuesta_min !== null ? Number(r.primera_respuesta_min) : null,
        resolucion_min: r.resolucion_min !== null ? Number(r.resolucion_min) : null,
      }))
    );
    setCargando(false);
  }, [empleadoId, rango]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const importar = async (file: File) => {
    try {
      const filas = parsearCSV(await file.text());
      const payload = filas.map((f) => ({ ...f, empleado_id: empleadoId }));
      const conHora = payload.filter((p) => p.hora !== null);
      const sinHora = payload.filter((p) => p.hora === null);
      if (sinHora.length) {
        const { error } = await supabase
          .from("atencion_metricas")
          .upsert(sinHora as any, { onConflict: "empleado_id,fecha", ignoreDuplicates: false });
        if (error) throw error;
      }
      if (conHora.length) {
        const { error } = await supabase
          .from("atencion_metricas")
          .upsert(conHora as any, { onConflict: "empleado_id,fecha,hora", ignoreDuplicates: false });
        if (error) throw error;
      }
      toast.success(`${filas.length} filas importadas`);
      cargar();
    } catch (e: any) {
      toast.error(e.message || "No se pudo importar el archivo");
    }
  };

  /* ---------------- Cruce por día ---------------- */
  const dias: DiaCruce[] = useMemo(() => {
    const porDia = new Map<string, { tipo: string; timestamp_real: string }[]>();
    fichajes.forEach((f) => {
      const k = getArgentinaDateString(f.timestamp_real);
      if (!porDia.has(k)) porDia.set(k, []);
      porDia.get(k)!.push(f);
    });

    const metricasDia = new Map<string, DiaCruce>();
    metricas.forEach((m) => {
      const d = metricasDia.get(m.fecha) ?? {
        fecha: m.fecha,
        entrada: null,
        salida: null,
        minutos: 0,
        chats: 0,
        sinRespuesta: 0,
        primeraRespuesta: null,
        resolucion: null,
      };
      d.chats += m.chats;
      d.sinRespuesta += m.chats_sin_respuesta;
      if (m.primera_respuesta_min !== null)
        d.primeraRespuesta = d.primeraRespuesta === null ? m.primera_respuesta_min : (d.primeraRespuesta + m.primera_respuesta_min) / 2;
      if (m.resolucion_min !== null)
        d.resolucion = d.resolucion === null ? m.resolucion_min : (d.resolucion + m.resolucion_min) / 2;
      metricasDia.set(m.fecha, d);
    });

    const claves = new Set<string>([...porDia.keys(), ...metricasDia.keys()]);
    return Array.from(claves)
      .sort()
      .map((fecha) => {
        const lista = porDia.get(fecha) || [];
        const entrada = lista.find((f) => f.tipo === "entrada");
        const salida = [...lista].reverse().find((f) => f.tipo === "salida");
        let minutos = 0;
        if (entrada && salida) {
          minutos = Math.max(
            0,
            Math.round((new Date(salida.timestamp_real).getTime() - new Date(entrada.timestamp_real).getTime()) / 60000)
          );
        }
        const base = metricasDia.get(fecha);
        return {
          fecha,
          entrada: entrada ? getArgentinaTimeString(entrada.timestamp_real) : null,
          salida: salida ? getArgentinaTimeString(salida.timestamp_real) : null,
          minutos,
          chats: base?.chats ?? 0,
          sinRespuesta: base?.sinRespuesta ?? 0,
          primeraRespuesta: base?.primeraRespuesta ?? null,
          resolucion: base?.resolucion ?? null,
        };
      });
  }, [fichajes, metricas]);

  const totales = useMemo(() => {
    const minutos = dias.reduce((a, d) => a + d.minutos, 0);
    const chats = dias.reduce((a, d) => a + d.chats, 0);
    const sinRespuesta = dias.reduce((a, d) => a + d.sinRespuesta, 0);
    const horas = minutos / 60;
    return {
      horas,
      chats,
      sinRespuesta,
      chatsPorHora: horas > 0 ? chats / horas : 0,
      diasFichados: dias.filter((d) => d.minutos > 0).length,
      inconsistencias: dias.filter((d) => d.minutos === 0 && d.chats > 0),
    };
  }, [dias]);

  /* ---------------- Franjas horarias ---------------- */
  const franjas = useMemo(() => {
    const chatsPorHora = new Array(24).fill(0);
    let hayHoras = false;
    metricas.forEach((m) => {
      if (m.hora !== null) {
        hayHoras = true;
        chatsPorHora[m.hora] += m.chats;
      }
    });

    // Presencia: cuántos días estuvo fichado en cada hora
    const presencia = new Array(24).fill(0);
    const porDia = new Map<string, { tipo: string; timestamp_real: string }[]>();
    fichajes.forEach((f) => {
      const k = getArgentinaDateString(f.timestamp_real);
      if (!porDia.has(k)) porDia.set(k, []);
      porDia.get(k)!.push(f);
    });
    porDia.forEach((lista) => {
      const entrada = lista.find((f) => f.tipo === "entrada");
      const salida = [...lista].reverse().find((f) => f.tipo === "salida");
      if (!entrada || !salida) return;
      const h1 = Number(getArgentinaTimeString(entrada.timestamp_real).split(":")[0]);
      const h2 = Number(getArgentinaTimeString(salida.timestamp_real).split(":")[0]);
      for (let h = h1; h <= h2 && h < 24; h++) presencia[h] += 1;
    });

    const data = Array.from({ length: 24 }, (_, h) => ({
      hora: `${String(h).padStart(2, "0")}h`,
      h,
      chats: chatsPorHora[h],
      presencia: presencia[h],
    })).filter((d) => d.chats > 0 || d.presencia > 0);

    const descubiertas = data.filter((d) => d.chats > 0 && d.presencia === 0);
    return { data, hayHoras, descubiertas };
  }, [metricas, fichajes]);

  const fmtHoras = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cruce de fichaje con atención al cliente</CardTitle>
          <CardDescription>
            {nombreCompleto} · las ventas se integrarán después con Centum
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Mes</Label>
            <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-[160px]" />
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importar(f);
              e.target.value = "";
            }}
          />
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Importar CSV de atención
          </Button>
          <p className="text-xs text-muted-foreground">
            Columnas: fecha, hora (opcional), chats, sin respuesta, primera respuesta (min), resolución (min)
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { t: "Horas trabajadas", v: `${totales.horas.toFixed(1)} h`, d: `${totales.diasFichados} días fichados` },
          { t: "Chats atendidos", v: totales.chats.toLocaleString("es-AR"), d: `${totales.sinRespuesta} sin respuesta` },
          { t: "Chats por hora trabajada", v: totales.chatsPorHora.toFixed(1), d: "productividad por hora presente" },
          {
            t: "Días con actividad sin fichaje",
            v: String(totales.inconsistencias.length),
            d: totales.inconsistencias.length ? "revisar fichajes" : "sin inconsistencias",
          },
        ].map((k) => (
          <Card key={k.t}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{k.t}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">{k.v}</div>
              <p className="text-xs text-muted-foreground">{k.d}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {totales.inconsistencias.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Días con chats pero sin fichaje completo
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {totales.inconsistencias.map((d) => (
              <Badge key={d.fecha} variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                {format(parseISO(d.fecha), "dd/MM", { locale: es })} · {d.chats} chats
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Horario vs franjas de más chats</CardTitle>
          <CardDescription>
            {franjas.hayHoras
              ? "Barras: chats por franja. Línea: días fichado presente en esa hora."
              : "Importá un CSV con columna de hora para ver las franjas."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {franjas.hayHoras ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={franjas.data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="l" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend />
                  <Bar yAxisId="l" dataKey="chats" name="Chats" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="r" type="monotone" dataKey="presencia" name="Días presente" stroke="#10b981" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
              {franjas.descubiertas.length > 0 && (
                <p className="mt-3 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                  Franjas con chats y sin presencia fichada: {franjas.descubiertas.map((d) => d.hora).join(", ")}
                </p>
              )}
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin datos por franja horaria.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle diario</CardTitle>
          <CardDescription>{cargando ? "Cargando…" : `${dias.length} días con datos`}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Entrada</th>
                <th className="py-2 pr-4">Salida</th>
                <th className="py-2 pr-4">Trabajó</th>
                <th className="py-2 pr-4">Chats</th>
                <th className="py-2 pr-4">Chats/hora</th>
                <th className="py-2 pr-4">Sin respuesta</th>
                <th className="py-2 pr-4">1ª resp.</th>
                <th className="py-2">Resolución</th>
              </tr>
            </thead>
            <tbody>
              {dias.map((d) => (
                <tr key={d.fecha} className={`border-b last:border-0 ${d.minutos === 0 && d.chats > 0 ? "bg-amber-500/10" : ""}`}>
                  <td className="py-2 pr-4 font-medium capitalize">{format(parseISO(d.fecha), "EEE dd/MM", { locale: es })}</td>
                  <td className="py-2 pr-4">{d.entrada ?? "-"}</td>
                  <td className="py-2 pr-4">{d.salida ?? "-"}</td>
                  <td className="py-2 pr-4">{d.minutos > 0 ? fmtHoras(d.minutos) : "-"}</td>
                  <td className="py-2 pr-4">{d.chats || "-"}</td>
                  <td className="py-2 pr-4">{d.minutos > 0 && d.chats > 0 ? (d.chats / (d.minutos / 60)).toFixed(1) : "-"}</td>
                  <td className="py-2 pr-4">{d.sinRespuesta || "-"}</td>
                  <td className="py-2 pr-4">{d.primeraRespuesta !== null ? `${d.primeraRespuesta.toFixed(1)} min` : "-"}</td>
                  <td className="py-2">{d.resolucion !== null ? `${d.resolucion.toFixed(1)} min` : "-"}</td>
                </tr>
              ))}
              {dias.length === 0 && !cargando && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    Sin datos para este mes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
