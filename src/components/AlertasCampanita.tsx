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
import { Input } from "@/components/ui/input";
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

const PREF_EMPLEADOS_KEY = "alertas_rrhh_empleados_ocultos";

function leerLista(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

interface EmpleadoMini {
  id: string;
  nombre: string;
  apellido: string;
}

export function AlertasCampanita() {
  const navigate = useNavigate();
  const [alertas, setAlertas] = useState<AlertaRrhh[]>([]);
  const [ocultos, setOcultos] = useState<string[]>(() => leerLista(PREF_KEY));
  const [empleadosOcultos, setEmpleadosOcultos] = useState<string[]>(() => leerLista(PREF_EMPLEADOS_KEY));
  const [empleados, setEmpleados] = useState<EmpleadoMini[]>([]);
  const [buscar, setBuscar] = useState("");

  const visibles = useMemo(
    () =>
      alertas.filter(
        (a) => !ocultos.includes(a.tipo) && !empleadosOcultos.some((id) => (a.clave ?? "").includes(id))
      ),
    [alertas, ocultos, empleadosOcultos]
  );
  const noLeidas = useMemo(() => visibles.filter((a) => !a.leida).length, [visibles]);

  const toggleTipo = (tipo: string, activo: boolean) => {
    const nuevos = activo ? ocultos.filter((t) => t !== tipo) : [...ocultos, tipo];
    setOcultos(nuevos);
    localStorage.setItem(PREF_KEY, JSON.stringify(nuevos));
  };

  const toggleEmpleado = (id: string, activo: boolean) => {
    const nuevos = activo ? empleadosOcultos.filter((e) => e !== id) : [...empleadosOcultos, id];
    setEmpleadosOcultos(nuevos);
    localStorage.setItem(PREF_EMPLEADOS_KEY, JSON.stringify(nuevos));
  };

  useEffect(() => {
    supabase
      .from("empleados")
      .select("id, nombre, apellido")
      .eq("activo", true)
      .order("apellido")
      .then(({ data }) => setEmpleados((data as EmpleadoMini[]) ?? []));
  }, []);

  const empleadosFiltrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    if (!q) return empleados;
    return empleados.filter((e) => `${e.nombre} ${e.apellido}`.toLowerCase().includes(q));
  }, [empleados, buscar]);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("alertas_rrhh")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    const lista = (data as AlertaRrhh[]) ?? [];
    setAlertas(lista);
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
        <DropdownMenuLabel className="flex items-center justify-between gap-1">
          <span>Avisos</span>
          <span className="flex items-center gap-1">
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
                <CheckCheck className="mr-1 h-3 w-3" /> Marcar leídas
              </Button>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  title="Elegir qué avisos recibir"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72" onClick={(e) => e.stopPropagation()}>
                <p className="mb-2 text-sm font-medium">¿Qué avisos querés recibir?</p>
                <div className="space-y-2">
                  {TIPOS.map((t) => (
                    <div key={t.tipo} className="flex items-center justify-between gap-2">
                      <Label htmlFor={`pref-${t.tipo}`} className="text-sm font-normal">
                        {t.label}
                      </Label>
                      <Switch
                        id={`pref-${t.tipo}`}
                        checked={!ocultos.includes(t.tipo)}
                        onCheckedChange={(v) => toggleTipo(t.tipo, v)}
                      />
                    </div>
                  ))}
                </div>
                <DropdownMenuSeparator className="my-3" />
                <p className="mb-1 text-sm font-medium">Empleados</p>
                <p className="mb-2 text-xs text-muted-foreground">
                  Apagá los que no querés que generen avisos.
                </p>
                <Input
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  placeholder="Buscar empleado…"
                  className="mb-2 h-8"
                />
                <ScrollArea className="h-56 pr-3">
                  <div className="space-y-2">
                    {empleadosFiltrados.map((e) => (
                      <div key={e.id} className="flex items-center justify-between gap-2">
                        <Label htmlFor={`emp-${e.id}`} className="text-sm font-normal">
                          {e.apellido}, {e.nombre}
                        </Label>
                        <Switch
                          id={`emp-${e.id}`}
                          checked={!empleadosOcultos.includes(e.id)}
                          onCheckedChange={(v) => toggleEmpleado(e.id, v)}
                        />
                      </div>
                    ))}
                    {empleadosFiltrados.length === 0 && (
                      <p className="text-xs text-muted-foreground">Sin resultados.</p>
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-80">
          {visibles.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">No hay avisos por ahora.</p>
          )}
          {visibles.map((a) => {
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
