import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Entrevista, EntrevistaEstado, Slot, hhmm } from "./entrevistasTypes";

const db = supabase as any;

const PX_POR_MIN = 0.9;

interface Props {
  refrescar?: number;
  onSeleccionar?: (ent: Entrevista) => void;
}

const minutos = (t: string) => {
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
};

const colorEstado = (e: EntrevistaEstado) =>
  e === "realizada"
    ? "bg-secondary text-secondary-foreground border-secondary"
    : e === "cancelada" || e === "no_asistio"
      ? "bg-destructive/15 text-destructive border-destructive/40 line-through"
      : "bg-primary text-primary-foreground border-primary";

export default function CalendarioEntrevistas({ refrescar, onSeleccionar }: Props) {
  const [semanaRef, setSemanaRef] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [entrevistas, setEntrevistas] = useState<Entrevista[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [cargando, setCargando] = useState(true);

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(semanaRef, i)), [semanaRef]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const desde = format(dias[0], "yyyy-MM-dd");
      const hasta = format(dias[6], "yyyy-MM-dd");
      const [{ data: ents }, { data: sl }] = await Promise.all([
        db
          .from("entrevistas")
          .select("*, candidatos(nombre, apellido, telefono), reclutamiento_puestos(nombre)")
          .gte("fecha", desde)
          .lte("fecha", hasta)
          .order("hora_inicio"),
        db
          .from("entrevistas_slots")
          .select("*")
          .gte("fecha", desde)
          .lte("fecha", hasta)
          .order("hora_inicio"),
      ]);
      setEntrevistas(ents || []);
      setSlots(sl || []);
    } catch (e: any) {
      toast.error("No se pudo cargar el calendario: " + (e.message || e));
    } finally {
      setCargando(false);
    }
  }, [dias]);

  useEffect(() => {
    cargar();
  }, [cargar, refrescar]);

  // Franja horaria visible: según los datos, con mínimo 8-20
  const { inicioMin, finMin } = useMemo(() => {
    const todos = [
      ...entrevistas.map((e) => minutos(e.hora_inicio)),
      ...slots.map((s) => minutos(s.hora_inicio)),
    ];
    const fines = [
      ...entrevistas.map((e) => minutos(e.hora_fin)),
      ...slots.map((s) => minutos(s.hora_fin)),
    ];
    const min = todos.length ? Math.min(...todos) : 8 * 60;
    const max = fines.length ? Math.max(...fines) : 20 * 60;
    return {
      inicioMin: Math.max(0, Math.floor(Math.min(min, 9 * 60) / 60) * 60),
      finMin: Math.min(24 * 60, Math.ceil(Math.max(max, 18 * 60) / 60) * 60),
    };
  }, [entrevistas, slots]);

  const horas = useMemo(() => {
    const arr: number[] = [];
    for (let m = inicioMin; m <= finMin; m += 60) arr.push(m);
    return arr;
  }, [inicioMin, finMin]);

  const altura = (finMin - inicioMin) * PX_POR_MIN;
  const top = (m: number) => (m - inicioMin) * PX_POR_MIN;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <CardTitle className="text-base capitalize">
          {format(dias[0], "d MMM", { locale: es })} – {format(dias[6], "d MMM yyyy", { locale: es })}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setSemanaRef(addDays(semanaRef, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSemanaRef(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            Esta semana
          </Button>
          <Button variant="outline" size="icon" onClick={() => setSemanaRef(addDays(semanaRef, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {cargando ? (
          <p className="text-muted-foreground">Cargando…</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              {/* Encabezado de días */}
              <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b">
                <div />
                {dias.map((d) => {
                  const hoy = isSameDay(d, new Date());
                  return (
                    <div key={d.toISOString()} className="px-1 pb-2 text-center">
                      <div className="text-xs uppercase text-muted-foreground">
                        {format(d, "EEE", { locale: es })}
                      </div>
                      <div
                        className={
                          "mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold " +
                          (hoy ? "bg-primary text-primary-foreground" : "")
                        }
                      >
                        {format(d, "d")}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grilla horaria */}
              <div className="grid grid-cols-[56px_repeat(7,1fr)]" style={{ height: altura }}>
                <div className="relative">
                  {horas.map((m) => (
                    <div
                      key={m}
                      className="absolute -translate-y-1/2 pr-2 text-right text-xs text-muted-foreground w-full"
                      style={{ top: top(m) }}
                    >
                      {String(Math.floor(m / 60)).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>

                {dias.map((d) => {
                  const fecha = format(d, "yyyy-MM-dd");
                  const ents = entrevistas.filter((e) => e.fecha === fecha && e.estado !== "cancelada");
                  const libres = slots.filter((s) => s.fecha === fecha && s.estado === "disponible");
                  return (
                    <div key={fecha} className="relative border-l">
                      {horas.map((m) => (
                        <div
                          key={m}
                          className="absolute left-0 right-0 border-t border-border/60"
                          style={{ top: top(m) }}
                        />
                      ))}

                      {libres.map((s) => (
                        <div
                          key={s.id}
                          className="absolute left-1 right-1 rounded border border-dashed border-muted-foreground/40 bg-muted/40 px-1 text-[10px] text-muted-foreground"
                          style={{
                            top: top(minutos(s.hora_inicio)),
                            height: Math.max(
                              14,
                              (minutos(s.hora_fin) - minutos(s.hora_inicio)) * PX_POR_MIN - 2
                            ),
                          }}
                        >
                          Libre {hhmm(s.hora_inicio)}
                        </div>
                      ))}

                      {ents.map((e) => {
                        // Entrevistas al mismo horario: se reparten el ancho del día
                        const simultaneas = ents.filter(
                          (o) =>
                            minutos(o.hora_inicio) < minutos(e.hora_fin) &&
                            minutos(o.hora_fin) > minutos(e.hora_inicio)
                        );
                        const total = simultaneas.length;
                        const idx = simultaneas.findIndex((o) => o.id === e.id);
                        return (
                        <button
                          key={e.id}
                          onClick={() => onSeleccionar?.(e)}
                          className={
                            "absolute overflow-hidden rounded border px-1 text-left text-[11px] leading-tight shadow-sm " +
                            colorEstado(e.estado)
                          }
                          style={{
                            top: top(minutos(e.hora_inicio)),
                            left: `calc(${(idx / total) * 100}% + 2px)`,
                            width: `calc(${100 / total}% - 4px)`,
                            height: Math.max(
                              18,
                              (minutos(e.hora_fin) - minutos(e.hora_inicio)) * PX_POR_MIN - 2
                            ),
                          }}
                        >
                          <span className="block truncate font-medium">
                            {e.candidatos?.nombre} {e.candidatos?.apellido ?? ""}
                          </span>
                          <span className="block truncate opacity-80">{hhmm(e.hora_inicio)}</span>
                        </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-primary" /> Entrevista reservada
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-secondary" /> Realizada
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded border border-dashed border-muted-foreground/40 bg-muted" />{" "}
            Horario libre
          </span>
          <Badge variant="outline">Tocá una entrevista para ver los datos</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
