import { EventoUnificado } from "@/lib/calendariosService";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  eventos: EventoUnificado[];
  onClickEvento: (ev: EventoUnificado) => void;
}

export function AgendaProxima({ eventos, onClickEvento }: Props) {
  const ahora = Date.now();
  const futuros = eventos
    .filter((e) => e.fecha_fin.getTime() >= ahora)
    .slice(0, 8);

  if (futuros.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">No hay próximos eventos.</p>;
  }

  return (
    <div className="divide-y">
      {futuros.map((ev) => (
        <button
          key={ev.id}
          onClick={() => onClickEvento(ev)}
          className="w-full flex items-start gap-3 p-3 hover:bg-accent/40 text-left"
        >
          <span className="h-3 w-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: ev.color }} />
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium truncate", ev.estado === "completado" && "line-through opacity-60")}>
              {ev.titulo}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(ev.fecha_inicio, "EEE d MMM", { locale: es })}
              {!ev.todo_el_dia && ` · ${format(ev.fecha_inicio, "HH:mm")}`}
              {" · "}{ev.calendario_nombre}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
