import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import { EventoUnificado } from "@/lib/calendariosService";
import { cn } from "@/lib/utils";

interface Props {
  mes: Date;
  eventos: EventoUnificado[];
  onClickEvento: (ev: EventoUnificado) => void;
  onClickDia: (d: Date) => void;
}

const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function VistaMes({ mes, eventos, onClickEvento, onClickDia }: Props) {
  const dias = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mes), { weekStartsOn: 1 });
    const fin = endOfWeek(endOfMonth(mes), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: inicio, end: fin });
  }, [mes]);

  const eventosPorDia = useMemo(() => {
    const map = new Map<string, EventoUnificado[]>();
    for (const ev of eventos) {
      const start = new Date(
        ev.fecha_inicio.getFullYear(),
        ev.fecha_inicio.getMonth(),
        ev.fecha_inicio.getDate()
      );
      const end = new Date(
        ev.fecha_fin.getFullYear(),
        ev.fecha_fin.getMonth(),
        ev.fecha_fin.getDate()
      );
      const cur = new Date(start);
      while (cur <= end) {
        const k = format(cur, "yyyy-MM-dd");
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(ev);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [eventos]);

  const hoy = new Date();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {DOW.map((d) => (
          <div key={d} className="px-2 py-1.5 text-xs font-semibold text-muted-foreground text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6 flex-1 overflow-auto">
        {dias.map((d) => {
          const k = format(d, "yyyy-MM-dd");
          const evs = eventosPorDia.get(k) ?? [];
          const fueraDeMes = !isSameMonth(d, mes);
          const esHoy = isSameDay(d, hoy);
          return (
            <div
              key={k}
              onClick={() => onClickDia(d)}
              className={cn(
                "border-r border-b p-1 min-h-[88px] cursor-pointer hover:bg-accent/30 flex flex-col",
                fueraDeMes && "bg-muted/20 text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "text-xs font-medium mb-0.5 self-start px-1.5 py-0.5 rounded-full",
                  esHoy && "bg-primary text-primary-foreground"
                )}
              >
                {format(d, "d")}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {evs.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClickEvento(ev);
                    }}
                    className={cn(
                      "w-full truncate text-left text-[11px] px-1.5 py-0.5 rounded text-white hover:opacity-90 transition",
                      ev.estado === "completado" && "line-through opacity-60"
                    )}
                    style={{ backgroundColor: ev.color }}
                    title={ev.titulo}
                  >
                    {ev.titulo}
                  </button>
                ))}
                {evs.length > 3 && (
                  <span className="text-[10px] text-muted-foreground px-1">
                    +{evs.length - 3} más
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
