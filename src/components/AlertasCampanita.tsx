import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCheck, AlertTriangle, CalendarClock, ClipboardList, Package, Users, FileWarning, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generarAlertasRrhh, marcarAlertaLeida, marcarTodasLeidas, type AlertaRrhh } from "@/lib/alertasRrhh";
import { formatArgentinaDateTime } from "@/lib/dateUtils";

const ICONOS: Record<string, typeof Bell> = {
  fichaje_faltante: FileWarning,
  vacaciones_pendiente: CalendarClock,
  solicitud_pendiente: ClipboardList,
  tarea_vencida: AlertTriangle,
  cobertura_pendiente: Users,
  insumos_cerrado: Package,
};

const TIPOS: { tipo: string; label: string }[] = [
  { tipo: "fichaje_faltante", label: "Fichajes faltantes" },
  { tipo: "vacaciones_pendiente", label: "Vacaciones por aprobar" },
  { tipo: "solicitud_pendiente", label: "Solicitudes pendientes" },
  { tipo: "tarea_vencida", label: "Tareas vencidas" },
  { tipo: "cobertura_pendiente", label: "Coberturas de vacaciones" },
  { tipo: "insumos_cerrado", label: "Controles de insumos" },
];

const PREF_KEY = "alertas_rrhh_tipos_ocultos";

function leerOcultos(): string[] {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function AlertasCampanita() {
  const navigate = useNavigate();
  const [alertas, setAlertas] = useState<AlertaRrhh[]>([]);
  const [ocultos, setOcultos] = useState<string[]>(() => leerOcultos());

  const visibles = useMemo(() => alertas.filter((a) => !ocultos.includes(a.tipo)), [alertas, ocultos]);
  const noLeidas = useMemo(() => visibles.filter((a) => !a.leida).length, [visibles]);

  const toggleTipo = (tipo: string, activo: boolean) => {
    const nuevos = activo ? ocultos.filter((t) => t !== tipo) : [...ocultos, tipo];
    setOcultos(nuevos);
    localStorage.setItem(PREF_KEY, JSON.stringify(nuevos));
  };

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("alertas_rrhh")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    const lista = (data as AlertaRrhh[]) ?? [];
    setAlertas(lista);
    setNoLeidas(lista.filter((a) => !a.leida).length);
  }, []);

  useEffect(() => {
    // Genera las alertas del día (idempotente) y luego carga
    generarAlertasRrhh().finally(cargar);

    const channel = supabase
      .channel("alertas_rrhh_campanita")
      .on("postgres_changes", { event: "*", schema: "public", table: "alertas_rrhh" }, cargar)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [cargar]);

  const abrir = async (a: AlertaRrhh) => {
    if (!a.leida) await marcarAlertaLeida(a.id);
    if (a.enlace) navigate(a.enlace);
    cargar();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Avisos">
          <Bell className="h-4 w-4" />
          {noLeidas > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {noLeidas > 99 ? "99+" : noLeidas}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Avisos</span>
          {noLeidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={async () => {
                await marcarTodasLeidas();
                cargar();
              }}
            >
              <CheckCheck className="mr-1 h-3 w-3" /> Marcar todas leídas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-80">
          {alertas.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">No hay avisos por ahora.</p>
          )}
          {alertas.map((a) => {
            const Icono = ICONOS[a.tipo] ?? Bell;
            return (
              <DropdownMenuItem
                key={a.id}
                className={`flex cursor-pointer items-start gap-2 py-2 ${a.leida ? "opacity-60" : ""}`}
                onClick={() => abrir(a)}
              >
                <Icono className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className={`text-sm leading-tight ${a.leida ? "" : "font-medium"}`}>{a.titulo}</p>
                  {a.detalle && <p className="truncate text-xs text-muted-foreground">{a.detalle}</p>}
                  <p className="text-[10px] text-muted-foreground">{formatArgentinaDateTime(a.created_at)}</p>
                </div>
              </DropdownMenuItem>
            );
          })}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
