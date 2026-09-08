import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Clock, MessageSquare, MessageSquareX, Target, TrendingUp } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Datos de ejemplo (sin conexión a base de datos por ahora)          */
/* ------------------------------------------------------------------ */

const PERSONA = { nombre: "Ana Ríos", rol: "Atención y ventas online" };
const MES_ACTUAL = "Septiembre 2026";

type Semaforo = "verde" | "amarillo" | "rojo";

interface Indicador {
  clave: string;
  titulo: string;
  valor: number;
  objetivo: number;
  formato: "moneda" | "cantidad" | "minutos" | "horas";
  /** true = menos es mejor */
  invertido?: boolean;
  icono: React.ElementType;
}

const INDICADORES_BASE: Indicador[] = [
  { clave: "ventas", titulo: "Ventas del mes", valor: 4_180_000, objetivo: 5_000_000, formato: "moneda", icono: TrendingUp },
  { clave: "chats", titulo: "Chats atendidos", valor: 612, objetivo: 600, formato: "cantidad", icono: MessageSquare },
  { clave: "sinRespuesta", titulo: "Chats sin respuesta", valor: 34, objetivo: 20, formato: "cantidad", invertido: true, icono: MessageSquareX },
  { clave: "primeraRespuesta", titulo: "Tiempo prom. 1ª respuesta", valor: 4.2, objetivo: 3, formato: "minutos", invertido: true, icono: Clock },
  { clave: "resolucion", titulo: "Tiempo prom. de resolución", valor: 5.1, objetivo: 6, formato: "horas", invertido: true, icono: Clock },
];

/** Evolución diaria del mes en curso (datos de ejemplo) */
const EVOLUCION_MES = Array.from({ length: 18 }, (_, i) => {
  const dia = i + 1;
  return {
    dia: `${dia}`,
    ventas: Math.round(180000 + Math.sin(i / 2) * 60000 + i * 3000),
    chats: Math.round(28 + Math.cos(i / 3) * 8),
    score: Math.round(64 + Math.sin(i / 4) * 9 + i * 0.6),
  };
});

const MESES_ANTERIORES = [
  { mes: "Abr", score: 68, ventas: 3_450_000, chats: 520, sinRespuesta: 62, primeraRespuesta: 6.8, resolucion: 7.4 },
  { mes: "May", score: 71, ventas: 3_780_000, chats: 548, sinRespuesta: 55, primeraRespuesta: 6.1, resolucion: 7.0 },
  { mes: "Jun", score: 66, ventas: 3_610_000, chats: 505, sinRespuesta: 71, primeraRespuesta: 7.2, resolucion: 7.9 },
  { mes: "Jul", score: 74, ventas: 4_020_000, chats: 574, sinRespuesta: 43, primeraRespuesta: 5.2, resolucion: 6.3 },
  { mes: "Ago", score: 78, ventas: 4_310_000, chats: 598, sinRespuesta: 38, primeraRespuesta: 4.6, resolucion: 5.6 },
];

/* ------------------------------------------------------------------ */
/* Utilidades                                                         */
/* ------------------------------------------------------------------ */

const formatear = (valor: number, formato: Indicador["formato"]) => {
  switch (formato) {
    case "moneda":
      return `$${Math.round(valor).toLocaleString("es-AR")}`;
    case "minutos":
      return `${valor.toFixed(1)} min`;
    case "horas":
      return `${valor.toFixed(1)} h`;
    default:
      return Math.round(valor).toLocaleString("es-AR");
  }
};

/** Cumplimiento 0..1+ — para indicadores invertidos, objetivo/valor */
const cumplimiento = (ind: Indicador) => {
  if (ind.invertido) return ind.valor <= 0 ? 1.2 : ind.objetivo / ind.valor;
  return ind.objetivo <= 0 ? 1 : ind.valor / ind.objetivo;
};

const semaforo = (ratio: number): Semaforo => (ratio >= 1 ? "verde" : ratio >= 0.85 ? "amarillo" : "rojo");

const CLASES_SEMAFORO: Record<Semaforo, { texto: string; fondo: string; borde: string; punto: string; etiqueta: string }> = {
  verde: {
    texto: "text-emerald-700 dark:text-emerald-400",
    fondo: "bg-emerald-500/10",
    borde: "border-emerald-500/30",
    punto: "bg-emerald-500",
    etiqueta: "Buen desempeño",
  },
  amarillo: {
    texto: "text-amber-700 dark:text-amber-400",
    fondo: "bg-amber-500/10",
    borde: "border-amber-500/30",
    punto: "bg-amber-500",
    etiqueta: "Atención",
  },
  rojo: {
    texto: "text-red-700 dark:text-red-400",
    fondo: "bg-red-500/10",
    borde: "border-red-500/30",
    punto: "bg-red-500",
    etiqueta: "Por debajo del objetivo",
  },
};

/* ------------------------------------------------------------------ */
/* Componentes                                                        */
/* ------------------------------------------------------------------ */

function TarjetaIndicador({ ind }: { ind: Indicador }) {
  const ratio = cumplimiento(ind);
  const estado = semaforo(ratio);
  const s = CLASES_SEMAFORO[estado];
  const Icono = ind.icono;

  return (
    <Card className={`border ${s.borde}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-xs font-medium text-muted-foreground">{ind.titulo}</CardTitle>
          <div className="text-2xl font-semibold tracking-tight">{formatear(ind.valor, ind.formato)}</div>
        </div>
        <span className={`rounded-lg p-2 ${s.fondo}`}>
          <Icono className={`h-4 w-4 ${s.texto}`} />
        </span>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress value={Math.min(ratio * 100, 100)} className="h-1.5" />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Objetivo {formatear(ind.objetivo, ind.formato)}</span>
          <span className={`flex items-center gap-1 font-medium ${s.texto}`}>
            <span className={`h-2 w-2 rounded-full ${s.punto}`} />
            {Math.round(ratio * 100)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function Anillo({ score, objetivo }: { score: number; objetivo: number }) {
  const estado = semaforo(score / objetivo);
  const s = CLASES_SEMAFORO[estado];
  const color = estado === "verde" ? "#10b981" : estado === "amarillo" ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex items-center gap-5">
      <div
        className="relative flex h-28 w-28 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${color} ${Math.min(score, 100) * 3.6}deg, hsl(var(--muted)) 0deg)` }}
      >
        <div className="flex h-[88px] w-[88px] flex-col items-center justify-center rounded-full bg-card">
          <span className="text-3xl font-semibold tracking-tight">{score}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">score</span>
        </div>
      </div>
      <div className="space-y-2">
        <Badge variant="outline" className={`${s.fondo} ${s.texto} ${s.borde}`}>
          <span className={`mr-2 h-2 w-2 rounded-full ${s.punto}`} />
          {s.etiqueta}
        </Badge>
        <p className="text-sm text-muted-foreground">
          Objetivo mensual: <span className="font-medium text-foreground">{objetivo} puntos</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Diferencia:{" "}
          <span className={`font-medium ${s.texto}`}>
            {score - objetivo >= 0 ? "+" : ""}
            {score - objetivo} puntos
          </span>
        </p>
      </div>
    </div>
  );
}

export default function PerformanceIndividual() {
  const [objetivos, setObjetivos] = useState<Record<string, number>>(
    Object.fromEntries(INDICADORES_BASE.map((i) => [i.clave, i.objetivo]))
  );
  const [objetivoScore, setObjetivoScore] = useState(80);
  const [borrador, setBorrador] = useState<Record<string, string>>(
    Object.fromEntries(INDICADORES_BASE.map((i) => [i.clave, String(i.objetivo)]))
  );
  const [borradorScore, setBorradorScore] = useState("80");

  const indicadores = useMemo(
    () => INDICADORES_BASE.map((i) => ({ ...i, objetivo: objetivos[i.clave] ?? i.objetivo })),
    [objetivos]
  );

  const score = useMemo(() => {
    const promedio = indicadores.reduce((a, i) => a + Math.min(cumplimiento(i), 1.2), 0) / indicadores.length;
    return Math.round(promedio * 100);
  }, [indicadores]);

  const estadoGeneral = semaforo(score / objetivoScore);
  const sGeneral = CLASES_SEMAFORO[estadoGeneral];

  const scoreMesAnterior = MESES_ANTERIORES[MESES_ANTERIORES.length - 1].score;
  const variacion = score - scoreMesAnterior;

  const enRojo = indicadores.filter((i) => semaforo(cumplimiento(i)) === "rojo");
  const enVerde = indicadores.filter((i) => semaforo(cumplimiento(i)) === "verde");

  const resumen =
    estadoGeneral === "verde"
      ? `Vas por encima del objetivo del mes. ${enVerde.length} de ${indicadores.length} indicadores están en verde. Mantené el ritmo de respuesta y seguimiento de chats.`
      : estadoGeneral === "amarillo"
        ? `Estás cerca del objetivo, con margen de mejora. Poné el foco en ${enRojo.map((i) => i.titulo.toLowerCase()).join(" y ") || "sostener el volumen de ventas"}.`
        : `Estás por debajo del objetivo del mes. Prioridad: ${enRojo.map((i) => i.titulo.toLowerCase()).join(", ") || "mejorar el volumen de ventas"}.`;

  const evolucionMeses = [...MESES_ANTERIORES, { mes: "Sep", score, ventas: indicadores[0].valor, chats: indicadores[1].valor }];

  const guardarObjetivos = () => {
    const nuevos: Record<string, number> = {};
    for (const i of INDICADORES_BASE) {
      const n = Number(borrador[i.clave]);
      if (!Number.isFinite(n) || n <= 0) {
        toast.error(`Revisá el objetivo de "${i.titulo}"`);
        return;
      }
      nuevos[i.clave] = n;
    }
    const ns = Number(borradorScore);
    if (!Number.isFinite(ns) || ns <= 0 || ns > 100) {
      toast.error("El objetivo de score debe estar entre 1 y 100");
      return;
    }
    setObjetivos(nuevos);
    setObjetivoScore(ns);
    toast.success("Objetivos actualizados");
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Seguimiento de performance</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{PERSONA.nombre}</h1>
        <p className="text-sm text-muted-foreground">
          {PERSONA.rol} · {MES_ACTUAL} · datos de ejemplo
        </p>
      </header>

      <Tabs defaultValue="persona" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="persona">Vista de la persona</TabsTrigger>
          <TabsTrigger value="admin">Vista admin</TabsTrigger>
        </TabsList>

        {/* ---------------- Vista persona ---------------- */}
        <TabsContent value="persona" className="space-y-6">
          <Card className={`border ${sGeneral.borde}`}>
            <CardContent className="flex flex-col gap-6 pt-6 md:flex-row md:items-center md:justify-between">
              <Anillo score={score} objetivo={objetivoScore} />
              <div className={`max-w-sm rounded-xl p-4 text-sm ${sGeneral.fondo}`}>
                <p className="mb-1 font-medium">Resumen del mes</p>
                <p className="text-muted-foreground">{resumen}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {indicadores.map((i) => (
              <TarjetaIndicador key={i.clave} ind={i} />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolución durante el mes</CardTitle>
              <CardDescription>Ventas diarias y score acumulado</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={EVOLUCION_MES}>
                  <defs>
                    <linearGradient id="gradVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="l" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number, n) => (n === "Ventas" ? `$${v.toLocaleString("es-AR")}` : v)}
                    contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Legend />
                  <Area yAxisId="l" type="monotone" dataKey="ventas" name="Ventas" stroke="hsl(var(--primary))" fill="url(#gradVentas)" strokeWidth={2} />
                  <Line yAxisId="r" type="monotone" dataKey="score" name="Score" stroke="#10b981" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Vista admin ---------------- */}
        <TabsContent value="admin" className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Conclusión ejecutiva</CardTitle>
                <CardDescription>{MES_ACTUAL} · comparado con el mes anterior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className={`${sGeneral.fondo} ${sGeneral.texto} ${sGeneral.borde}`}>
                    <span className={`mr-2 h-2 w-2 rounded-full ${sGeneral.punto}`} />
                    Score {score} / objetivo {objetivoScore}
                  </Badge>
                  <span className={`flex items-center gap-1 font-medium ${variacion >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {variacion >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {variacion >= 0 ? "+" : ""}
                    {variacion} vs mes anterior
                  </span>
                </div>
                <p className="text-muted-foreground">
                  {enRojo.length === 0
                    ? "Todos los indicadores cumplen o superan el objetivo. Se recomienda subir la vara del próximo mes."
                    : `Indicadores por debajo del objetivo: ${enRojo.map((i) => i.titulo.toLowerCase()).join(", ")}. ${
                        enVerde.length > 0 ? `Se sostienen bien: ${enVerde.map((i) => i.titulo.toLowerCase()).join(", ")}.` : ""
                      }`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4" />
                  Objetivos del mes
                </CardTitle>
                <CardDescription>Editables (no se guardan aún)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Score objetivo</Label>
                  <Input value={borradorScore} onChange={(e) => setBorradorScore(e.target.value)} inputMode="decimal" />
                </div>
                {INDICADORES_BASE.map((i) => (
                  <div key={i.clave} className="space-y-1">
                    <Label className="text-xs">{i.titulo}</Label>
                    <Input
                      value={borrador[i.clave]}
                      inputMode="decimal"
                      onChange={(e) => setBorrador((p) => ({ ...p, [i.clave]: e.target.value }))}
                    />
                  </div>
                ))}
                <Button className="w-full" onClick={guardarObjetivos}>
                  Aplicar objetivos
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {indicadores.map((i) => (
              <TarjetaIndicador key={i.clave} ind={i} />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evolución del score</CardTitle>
                <CardDescription>Últimos 6 meses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={evolucionMeses}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="score" name="Score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comparación con meses anteriores</CardTitle>
                <CardDescription>Ventas y chats atendidos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={evolucionMeses}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="l" tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: number, n) => (n === "Ventas" ? `$${v.toLocaleString("es-AR")}` : v)}
                      contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    />
                    <Legend />
                    <Bar yAxisId="l" dataKey="ventas" name="Ventas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="r" dataKey="chats" name="Chats" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalle mensual</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4">Mes</th>
                    <th className="py-2 pr-4">Score</th>
                    <th className="py-2 pr-4">Ventas</th>
                    <th className="py-2 pr-4">Chats</th>
                    <th className="py-2 pr-4">Sin respuesta</th>
                    <th className="py-2 pr-4">1ª respuesta</th>
                    <th className="py-2">Resolución</th>
                  </tr>
                </thead>
                <tbody>
                  {MESES_ANTERIORES.map((m) => (
                    <tr key={m.mes} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{m.mes}</td>
                      <td className="py-2 pr-4">{m.score}</td>
                      <td className="py-2 pr-4">${m.ventas.toLocaleString("es-AR")}</td>
                      <td className="py-2 pr-4">{m.chats}</td>
                      <td className="py-2 pr-4">{m.sinRespuesta}</td>
                      <td className="py-2 pr-4">{m.primeraRespuesta.toFixed(1)} min</td>
                      <td className="py-2">{m.resolucion.toFixed(1)} h</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/40">
                    <td className="py-2 pr-4 font-medium">Sep (actual)</td>
                    <td className="py-2 pr-4 font-medium">{score}</td>
                    <td className="py-2 pr-4">${indicadores[0].valor.toLocaleString("es-AR")}</td>
                    <td className="py-2 pr-4">{indicadores[1].valor}</td>
                    <td className="py-2 pr-4">{indicadores[2].valor}</td>
                    <td className="py-2 pr-4">{indicadores[3].valor.toFixed(1)} min</td>
                    <td className="py-2">{indicadores[4].valor.toFixed(1)} h</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
