import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, Clock, Check, X, UserCog, ChevronsUpDown, Plus, CheckCheck } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { ConstanciaVacacionesButton } from "./ConstanciaVacacionesButton";
import { CargaManualVacacionesDialog } from "./CargaManualVacacionesDialog";


interface CalendarioVacacionesProps {
  rol: string;
  sucursalId?: string;
}

interface VacacionDia {
  fecha: Date;
  empleados: Array<{
    id: string;
    nombre: string;
    apellido: string;
    estado: string;
    solicitudId: string;
    fechaInicio: string;
    fechaFin: string;
  }>;
  bloqueado: boolean;
  motivoBloqueo?: string;
}

export function CalendarioVacaciones({ rol, sucursalId }: CalendarioVacacionesProps) {
  const [loading, setLoading] = useState(true);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date());
  const [vacaciones, setVacaciones] = useState<VacacionDia[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [puestos, setPuestos] = useState<string[]>([]);
  const [empleadosLista, setEmpleadosLista] = useState<Array<{ id: string; nombre: string; apellido: string; dni: string | null }>>([]);
  const [filtroSucursal, setFiltroSucursal] = useState<string>("todas");
  const [filtroPuesto, setFiltroPuesto] = useState<string>("todos");
  const [nuevoEmpleadoId, setNuevoEmpleadoId] = useState<Record<string, string>>({});
  const [reasignando, setReasignando] = useState<string | null>(null);
  const [empleadoPickerOpen, setEmpleadoPickerOpen] = useState<Record<string, boolean>>({});
  const [cargaManualOpen, setCargaManualOpen] = useState(false);
  const [fechaCargaManual, setFechaCargaManual] = useState<Date | undefined>(undefined);
  const { toast } = useToast();


  useEffect(() => {
    fetchSucursalesYPuestos();
    fetchEmpleadosLista();
  }, []);

  useEffect(() => {
    fetchVacaciones();
  }, [mesSeleccionado, rol, sucursalId, filtroSucursal, filtroPuesto]);

  const fetchSucursalesYPuestos = async () => {
    try {
      // Fetch sucursales
      const { data: sucursalesData } = await supabase
        .from('sucursales')
        .select('id, nombre')
        .eq('activa', true);
      
      setSucursales(sucursalesData || []);

      // Fetch puestos únicos
      const { data: empleadosData } = await supabase
        .from('empleados')
        .select('puesto')
        .not('puesto', 'is', null);
      
      const puestosUnicos = [...new Set(empleadosData?.map(e => e.puesto).filter(Boolean))];
      setPuestos(puestosUnicos as string[]);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const fetchEmpleadosLista = async () => {
    try {
      const { data } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, dni')
        .eq('activo', true)
        .order('apellido', { ascending: true });
      setEmpleadosLista((data as any) || []);
    } catch (error) {
      console.error('Error fetching empleados list:', error);
    }
  };

  const handleReasignar = async (solicitudId: string, fechaInicio: string, fechaFin: string) => {
    const nuevoId = nuevoEmpleadoId[solicitudId];
    if (!nuevoId) {
      toast({ title: "Seleccioná un empleado", variant: "destructive" });
      return;
    }
    try {
      setReasignando(solicitudId);
      const { data: conflictos, error: conflictoError } = await supabase
        .from('solicitudes_vacaciones')
        .select('id')
        .eq('empleado_id', nuevoId)
        .in('estado', ['aprobada', 'pendiente', 'gozadas'] as any)
        .lte('fecha_inicio', fechaFin)
        .gte('fecha_fin', fechaInicio)
        .neq('id', solicitudId);
      if (conflictoError) throw conflictoError;
      if (conflictos && conflictos.length > 0) {
        toast({
          title: "Conflicto de fechas",
          description: "El empleado seleccionado ya tiene una solicitud que se solapa con estas fechas.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('solicitudes_vacaciones')
        .update({ empleado_id: nuevoId })
        .eq('id', solicitudId);
      if (error) throw error;

      toast({ title: "Solicitud reasignada correctamente" });
      setNuevoEmpleadoId((s) => ({ ...s, [solicitudId]: '' }));
      setEmpleadoPickerOpen((s) => ({ ...s, [solicitudId]: false }));
      fetchVacaciones();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error al reasignar", description: e.message, variant: "destructive" });
    } finally {
      setReasignando(null);
    }
  };

  const fetchVacaciones = async () => {

    try {
      setLoading(true);
      const inicio = startOfMonth(mesSeleccionado);
      const fin = endOfMonth(mesSeleccionado);
      const dias = eachDayOfInterval({ start: inicio, end: fin });

      // Fetch solicitudes aprobadas y gozadas
      let query = supabase
        .from('solicitudes_vacaciones')
        .select(`
          id,
          fecha_inicio,
          fecha_fin,
          estado,
          empleado_id,
          empleados!solicitudes_vacaciones_empleado_id_fkey(id, nombre, apellido, sucursal_id, puesto)
        `)
        .lte('fecha_inicio', fin.toISOString().split('T')[0])
        .gte('fecha_fin', inicio.toISOString().split('T')[0])
        .in('estado', ['aprobada', 'gozadas', 'pendiente']);

      if (rol === 'gerente_sucursal' && sucursalId) {
        query = query.eq('empleados.sucursal_id', sucursalId);
      }

      // Aplicar filtros
      if (filtroSucursal !== "todas") {
        query = query.eq('empleados.sucursal_id', filtroSucursal);
      }

      const { data: solicitudes, error: solicitudesError } = await query;
      if (solicitudesError) throw solicitudesError;

      // Filtrar por puesto después de la consulta
      let solicitudesFiltradas = solicitudes || [];
      if (filtroPuesto !== "todos") {
        solicitudesFiltradas = solicitudesFiltradas.filter((s: any) => 
          s.empleados?.puesto === filtroPuesto
        );
      }

      // Fetch bloqueos
      const { data: bloqueos, error: bloqueosError } = await supabase
        .from('vacaciones_bloqueos')
        .select('*')
        .eq('activo', true)
        .lte('fecha_inicio', fin.toISOString().split('T')[0])
        .gte('fecha_fin', inicio.toISOString().split('T')[0]);

      if (bloqueosError) throw bloqueosError;

      // Procesar datos por día
      const vacacionesPorDia: VacacionDia[] = dias.map((dia) => {
        const diaStr = format(dia, 'yyyy-MM-dd');
        
        // Verificar si está bloqueado
        const bloqueado = bloqueos?.some(
          (b) => b.fecha_inicio <= diaStr && b.fecha_fin >= diaStr
        ) || false;

        const motivoBloqueo = bloqueos?.find(
          (b) => b.fecha_inicio <= diaStr && b.fecha_fin >= diaStr
        )?.motivo;

        // Obtener empleados con vacaciones este día
        const empleadosDelDia = solicitudesFiltradas
          ?.filter((s: any) => s.fecha_inicio <= diaStr && s.fecha_fin >= diaStr)
          .map((s: any) => ({
            id: s.empleados.id,
            nombre: s.empleados.nombre,
            apellido: s.empleados.apellido,
            estado: s.estado,
            solicitudId: s.id,
            fechaInicio: s.fecha_inicio,
            fechaFin: s.fecha_fin,
          })) || [];

        return {
          fecha: dia,
          empleados: empleadosDelDia,
          bloqueado,
          motivoBloqueo,
        };
      });

      setVacaciones(vacacionesPorDia);
    } catch (error: any) {
      console.error('Error fetching calendar:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el calendario",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cambiarMes = (direction: number) => {
    const nuevaFecha = new Date(mesSeleccionado);
    nuevaFecha.setMonth(nuevaFecha.getMonth() + direction);
    setMesSeleccionado(nuevaFecha);
  };

  const puedeAprobar = rol === 'admin_rrhh' || rol === 'gerente_sucursal';
  const puedeReasignar = rol === 'admin_rrhh';
  const [comentario, setComentario] = useState<Record<string, string>>({});
  const [accionando, setAccionando] = useState<string | null>(null);

  const handleCambioEstado = async (
    solicitudId: string,
    nuevoEstado: 'pendiente' | 'aprobada' | 'rechazada' | 'gozadas'
  ) => {

    if (nuevoEstado === 'rechazada' && !comentario[solicitudId]?.trim()) {
      toast({ title: "Comentario requerido", description: "Indica el motivo del rechazo", variant: "destructive" });
      return;
    }
    try {
      setAccionando(solicitudId);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: emp } = await supabase
        .from('empleados').select('id').eq('user_id', user?.id).single();
      if (!emp) throw new Error('No se encontró el empleado');

      const updatePayload: any = nuevoEstado === 'pendiente'
        ? {
            estado: 'pendiente',
            aprobado_por: null,
            fecha_aprobacion: null,
            comentarios_aprobacion: null,
          }
        : {
            estado: nuevoEstado,
            aprobado_por: emp.id,
            fecha_aprobacion: new Date().toISOString(),
            comentarios_aprobacion: comentario[solicitudId] || null,
          };

      const { error } = await supabase
        .from('solicitudes_vacaciones')
        .update(updatePayload)
        .eq('id', solicitudId);
      if (error) throw error;

      const msg =
        nuevoEstado === 'aprobada' ? 'Solicitud aprobada' :
        nuevoEstado === 'rechazada' ? 'Solicitud rechazada' :
        nuevoEstado === 'gozadas' ? 'Marcada como gozada' :
        'Solicitud marcada como pendiente';

      toast({ title: msg });
      setComentario((c) => ({ ...c, [solicitudId]: '' }));
      fetchVacaciones();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setAccionando(null);
    }
  };

  // Función para asignar color consistente y más visible basado en el ID del empleado
  const getEmpleadoColor = (empleadoId: string) => {
    const coloresFondo = [
      'bg-blue-200 border-blue-500 text-blue-900 dark:bg-blue-800/50 dark:border-blue-500 dark:text-blue-100',
      'bg-emerald-200 border-emerald-500 text-emerald-900 dark:bg-emerald-800/50 dark:border-emerald-500 dark:text-emerald-100',
      'bg-purple-200 border-purple-500 text-purple-900 dark:bg-purple-800/50 dark:border-purple-500 dark:text-purple-100',
      'bg-amber-200 border-amber-500 text-amber-900 dark:bg-amber-800/50 dark:border-amber-500 dark:text-amber-100',
      'bg-rose-200 border-rose-500 text-rose-900 dark:bg-rose-800/50 dark:border-rose-500 dark:text-rose-100',
      'bg-cyan-200 border-cyan-500 text-cyan-900 dark:bg-cyan-800/50 dark:border-cyan-500 dark:text-cyan-100',
      'bg-pink-200 border-pink-500 text-pink-900 dark:bg-pink-800/50 dark:border-pink-500 dark:text-pink-100',
      'bg-indigo-200 border-indigo-500 text-indigo-900 dark:bg-indigo-800/50 dark:border-indigo-500 dark:text-indigo-100',
      'bg-teal-200 border-teal-500 text-teal-900 dark:bg-teal-800/50 dark:border-teal-500 dark:text-teal-100',
      'bg-orange-200 border-orange-500 text-orange-900 dark:bg-orange-800/50 dark:border-orange-500 dark:text-orange-100',
    ];
    
    // Crear un hash simple del ID para asignar color consistente
    let hash = 0;
    for (let i = 0; i < empleadoId.length; i++) {
      hash = empleadoId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % coloresFondo.length;
    return coloresFondo[index];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Calendario de Vacaciones</CardTitle>
            <CardDescription>
              {format(mesSeleccionado, "MMMM yyyy", { locale: es })}
            </CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            {puedeReasignar && (
              <Button
                size="sm"
                onClick={() => { setFechaCargaManual(new Date()); setCargaManualOpen(true); }}
              >
                <Plus className="h-4 w-4 mr-1" /> Cargar vacaciones
              </Button>
            )}

            <button
              onClick={() => cambiarMes(-1)}
              className="px-3 py-1 rounded border hover:bg-accent"
            >
              ←
            </button>
            <button
              onClick={() => cambiarMes(1)}
              className="px-3 py-1 rounded border hover:bg-accent"
            >
              →
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {rol === 'admin_rrhh' && (
            <div className="space-y-2">
              <Label>Sucursal</Label>
              <Select value={filtroSucursal} onValueChange={setFiltroSucursal}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las sucursales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las sucursales</SelectItem>
                  {sucursales.map((suc) => (
                    <SelectItem key={suc.id} value={suc.id}>
                      {suc.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Puesto</Label>
            <Select value={filtroPuesto} onValueChange={setFiltroPuesto}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los puestos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los puestos</SelectItem>
                {puestos.map((puesto) => (
                  <SelectItem key={puesto} value={puesto}>
                    {puesto}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((dia) => (
            <div key={dia} className="text-center font-medium text-sm text-muted-foreground py-2">
              {dia}
            </div>
          ))}
          {vacaciones.length > 0 && Array.from({ length: (vacaciones[0].fecha.getDay() + 6) % 7 }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px]" />
          ))}
          {vacaciones.map((dia, idx) => {
            return (
              <div
                key={idx}
                className={`min-h-[80px] p-2 border rounded-lg ${
                  dia.bloqueado
                    ? 'bg-destructive/10 border-destructive'
                    : dia.empleados.length > 0
                    ? 'bg-muted/30 border-border'
                    : 'bg-background'
                }`}
              >
                <div className="text-sm font-medium mb-1">
                  {format(dia.fecha, 'd')}
                </div>
                {dia.bloqueado && (
                  <Badge variant="destructive" className="text-xs mb-1">
                    Bloqueado
                  </Badge>
                )}
                <div className="space-y-1">
                  {dia.empleados.slice(0, 5).map((emp, empIdx) => {
                    const isPending = emp.estado === 'pendiente';
                    const isAprobada = emp.estado === 'aprobada' || emp.estado === 'gozadas';
                    const canOpenPopover = (isPending && puedeAprobar) || puedeReasignar || (isAprobada && puedeAprobar);
                    const estadoLabel =
                      emp.estado === 'pendiente' ? 'Pendiente' :
                      emp.estado === 'aprobada' ? 'Aprobada' :
                      emp.estado === 'gozadas' ? 'Gozada' : emp.estado;
                    const chip = (
                      <div
                        className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${getEmpleadoColor(emp.id)} ${
                          isPending ? 'opacity-60 italic border-dashed' : ''
                        } ${canOpenPopover ? 'cursor-pointer hover:opacity-100 transition-opacity' : ''}`}
                        title={
                          canOpenPopover
                            ? (isPending ? 'Click para aprobar/rechazar' : 'Click para gestionar')
                            : estadoLabel
                        }
                      >
                        {isPending && <Clock className="h-3 w-3 shrink-0" />}
                        <span className="font-medium truncate">{emp.nombre} {emp.apellido.charAt(0)}.</span>
                      </div>
                    );

                    if (!canOpenPopover) {
                      return <div key={empIdx}>{chip}</div>;
                    }

                    return (
                      <Popover key={empIdx}>
                        <PopoverTrigger asChild>{chip}</PopoverTrigger>
                        <PopoverContent
                          className="w-80 space-y-3"
                          align="start"
                          onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                          <div className="space-y-1">
                            <p className="font-medium text-sm">{emp.nombre} {emp.apellido}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(emp.fechaInicio + 'T00:00:00'), "d 'de' MMM", { locale: es })} – {format(new Date(emp.fechaFin + 'T00:00:00'), "d 'de' MMM yyyy", { locale: es })}
                            </p>
                            <Badge variant="outline" className="text-xs">{estadoLabel}</Badge>
                          </div>

                          {puedeReasignar && (
                            <div className="space-y-2 pt-1 border-t">
                              <Label className="text-xs flex items-center gap-1">
                                <UserCog className="h-3 w-3" /> Reasignar a otro empleado
                              </Label>
                              <Popover
                                open={empleadoPickerOpen[emp.solicitudId] || false}
                                onOpenChange={(o) => setEmpleadoPickerOpen((s) => ({ ...s, [emp.solicitudId]: o }))}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-between text-xs font-normal"
                                  >
                                    {(() => {
                                      const sel = empleadosLista.find((e) => e.id === nuevoEmpleadoId[emp.solicitudId]);
                                      return sel ? `${sel.apellido}, ${sel.nombre}` : "Buscar empleado...";
                                    })()}
                                    <ChevronsUpDown className="h-3 w-3 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72 p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Nombre, apellido o DNI..." className="h-9" />
                                    <CommandList>
                                      <CommandEmpty>Sin resultados</CommandEmpty>
                                      <CommandGroup>
                                        {empleadosLista
                                          .filter((e) => e.id !== emp.id)
                                          .map((e) => (
                                            <CommandItem
                                              key={e.id}
                                              value={`${e.apellido} ${e.nombre} ${e.dni ?? ''}`}
                                              onSelect={() => {
                                                setNuevoEmpleadoId((s) => ({ ...s, [emp.solicitudId]: e.id }));
                                                setEmpleadoPickerOpen((s) => ({ ...s, [emp.solicitudId]: false }));
                                              }}
                                            >
                                              <span className="truncate">{e.apellido}, {e.nombre}</span>
                                              {e.dni && <span className="ml-auto text-xs text-muted-foreground">{e.dni}</span>}
                                            </CommandItem>
                                          ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="w-full"
                                disabled={reasignando === emp.solicitudId || !nuevoEmpleadoId[emp.solicitudId]}
                                onClick={() => handleReasignar(emp.solicitudId, emp.fechaInicio, emp.fechaFin)}
                              >
                                <UserCog className="h-3 w-3 mr-1" />
                                {reasignando === emp.solicitudId ? 'Reasignando...' : 'Reasignar empleado'}
                              </Button>
                            </div>
                          )}

                          <div className="space-y-2 pt-1 border-t">
                            <Label className="text-xs">Cambiar estado</Label>
                            <Textarea
                              placeholder="Comentario (obligatorio si rechazás)"
                              value={comentario[emp.solicitudId] || ''}
                              onChange={(e) => setComentario((c) => ({ ...c, [emp.solicitudId]: e.target.value }))}
                              rows={2}
                              className="text-xs"
                            />
                            <div className="flex gap-2">
                              {puedeReasignar && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  disabled={accionando === emp.solicitudId || emp.estado === 'pendiente'}
                                  onClick={() => handleCambioEstado(emp.solicitudId, 'pendiente')}
                                >
                                  <Clock className="h-3 w-3 mr-1" /> Pendiente
                                </Button>
                              )}
                              <Button
                                size="sm"
                                className="flex-1"
                                disabled={accionando === emp.solicitudId || emp.estado === 'aprobada'}
                                onClick={() => handleCambioEstado(emp.solicitudId, 'aprobada')}
                              >
                                <Check className="h-3 w-3 mr-1" /> Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex-1"
                                disabled={accionando === emp.solicitudId}
                                onClick={() => handleCambioEstado(emp.solicitudId, 'rechazada')}
                              >
                                <X className="h-3 w-3 mr-1" /> Rechazar
                              </Button>
                            </div>
                          </div>

                          {(emp.estado === 'aprobada' || emp.estado === 'gozadas') && (
                            <div className="space-y-2 pt-1 border-t">
                              <Label className="text-xs">Constancias</Label>
                              <div className="flex flex-col gap-1.5">
                                <ConstanciaVacacionesButton
                                  solicitudId={emp.solicitudId}
                                  tipo="vacaciones_otorgamiento"
                                />
                                <ConstanciaVacacionesButton
                                  solicitudId={emp.solicitudId}
                                  tipo="vacaciones_goce"
                                />
                              </div>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    );
                  })}
                </div>
                {dia.empleados.length > 5 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    +{dia.empleados.length - 5} más
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded border bg-muted" />
            Aprobada
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded border border-dashed bg-muted opacity-60">
              <Clock className="h-2.5 w-2.5" />
            </span>
            Pendiente de aprobación
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded border border-destructive bg-destructive/10" />
            Día bloqueado
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
