import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Check, X, Calendar, ClipboardList, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { generarComprobanteVacacionesPDF } from "@/utils/comprobanteVacacionesPDF";
import { imprimirConstanciaVacaciones } from "@/utils/constanciaVacacionesPDF";
import {
  CoberturaVacacionesDialog,
  COBERTURA_ESTADO_LABEL,
  COBERTURA_TIPO_LABEL,
} from "./CoberturaVacacionesDialog";

interface AprobacionVacacionesProps {
  rol: string;
  sucursalId?: string;
}

interface Solicitud {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  estado: string;
  empleado_sucursal_id?: string | null;
  empleado: {
    nombre: string;
    apellido: string;
    email: string;
  };
}

interface CoberturaResumen {
  estado: string;
  comentario_encargado: string | null;
  comentario_rrhh: string | null;
  dias: {
    fecha: string;
    tipo: string;
    hora_entrada: string | null;
    hora_salida: string | null;
    empleados?: { nombre: string; apellido: string } | null;
  }[];
}

export function AprobacionVacaciones({ rol, sucursalId }: AprobacionVacacionesProps) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [coberturas, setCoberturas] = useState<Record<string, CoberturaResumen>>({});
  const [coberturaAbierta, setCoberturaAbierta] = useState<Solicitud | null>(null);
  const { toast } = useToast();
  const esAdmin = rol === "admin_rrhh";

  useEffect(() => {
    fetchSolicitudes();
  }, [rol, sucursalId]);

  const fetchCoberturas = async (ids: string[]) => {
    if (!ids.length) {
      setCoberturas({});
      return;
    }
    const { data } = await (supabase as any)
      .from("vacaciones_cobertura")
      .select(
        "id, solicitud_id, estado, comentario_encargado, comentario_rrhh, vacaciones_cobertura_dias(fecha, tipo, hora_entrada, hora_salida, empleados:empleado_cobertura_id(nombre, apellido))"
      )
      .in("solicitud_id", ids);
    const map: Record<string, CoberturaResumen> = {};
    for (const c of (data || []) as any[]) {
      map[c.solicitud_id] = {
        estado: c.estado,
        comentario_encargado: c.comentario_encargado,
        comentario_rrhh: c.comentario_rrhh,
        dias: (c.vacaciones_cobertura_dias || []).sort((a: any, b: any) =>
          a.fecha < b.fecha ? -1 : 1
        ),
      };
    }
    setCoberturas(map);
  };

  const fetchSolicitudes = async () => {
    try {
      setLoading(true);
      
      // Obtener el empleado actual
      const { data: { user } } = await supabase.auth.getUser();
      const { data: empleadoActual } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      
      let query = supabase
        .from('solicitudes_vacaciones')
        .select(`
          id,
          empleado_id,
          fecha_inicio,
          fecha_fin,
          motivo,
          estado,
          etapa,
          comentario_gerente,
          empleados!solicitudes_vacaciones_empleado_id_fkey(nombre, apellido, email, sucursal_id)
        `)
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: true });

      if (rol === 'gerente_sucursal' && sucursalId) {
        query = query.eq('empleados.sucursal_id', sucursalId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let formattedData = (data || []).map((item: any) => ({
        ...item,
        empleado: item.empleados,
        empleado_sucursal_id: item.empleados?.sucursal_id ?? null,
      }));
      
      // Si es gerente, excluir sus propias solicitudes
      if (rol === 'gerente_sucursal' && empleadoActual) {
        formattedData = formattedData.filter((sol: any) => sol.empleado_id !== empleadoActual.id);
      }
      
      setSolicitudes(formattedData);
      await fetchCoberturas(formattedData.map((s: any) => s.id));
    } catch (error: any) {
      console.error('Error fetching solicitudes:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las solicitudes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (solicitudId: string) => {
    const cob = coberturas[solicitudId];
    if (esAdmin && (!cob || cob.estado === "borrador")) {
      toast({
        title: "Falta el plan de cobertura",
        description:
          "El encargado todavía no envió cómo va a cubrir esos días. Pedile la cobertura antes de aprobar.",
        variant: "destructive",
      });
      return;
    }
    try {
      const { data: empleadoAprob } = await supabase
        .from('empleados')
        .select('id, nombre, apellido')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!empleadoAprob) throw new Error('No se encontró el empleado');

      const fechaAprob = new Date().toISOString();
      const comentarios_aprobacion = comentarios[solicitudId] || null;

      const { error } = await supabase
        .from('solicitudes_vacaciones')
        .update({
          estado: 'aprobada' as const,
          aprobado_por: empleadoAprob.id,
          fecha_aprobacion: fechaAprob,
          comentarios_aprobacion,
        })
        .eq('id', solicitudId);

      if (error) throw error;

      // Buscar datos completos para el comprobante
      const sol = solicitudes.find((s) => s.id === solicitudId);
      const { data: solFull } = await supabase
        .from('solicitudes_vacaciones')
        .select(`
          id, fecha_inicio, fecha_fin, motivo,
          empleado:empleado_id (
            id, nombre, apellido, email, fecha_ingreso,
            puesto:puesto_id(nombre),
            sucursal:sucursal_id(nombre),
            datos:empleados_datos_sensibles(dni)
          )
        `)
        .eq('id', solicitudId)
        .maybeSingle();

      if (solFull?.empleado) {
        const emp: any = solFull.empleado;
        try {
          generarComprobanteVacacionesPDF({
            empleado: {
              nombre: emp.nombre,
              apellido: emp.apellido,
              email: emp.email,
              dni: emp.datos?.[0]?.dni ?? null,
              puesto: emp.puesto?.nombre ?? null,
              sucursal: emp.sucursal?.nombre ?? null,
              fecha_ingreso: emp.fecha_ingreso ?? null,
            },
            solicitud: {
              id: solFull.id,
              fecha_inicio: solFull.fecha_inicio,
              fecha_fin: solFull.fecha_fin,
              motivo: solFull.motivo ?? sol?.motivo ?? null,
              comentarios_aprobacion,
            },
            aprobador: { nombre: empleadoAprob.nombre, apellido: empleadoAprob.apellido },
            fecha_aprobacion: fechaAprob,
          });
        } catch (pdfErr) {
          console.warn('Error generando comprobante', pdfErr);
        }
      }

      // Dejar la cobertura como aprobada
      if (coberturas[solicitudId]) {
        await (supabase as any)
          .from("vacaciones_cobertura")
          .update({ estado: "aprobada", resuelto_at: new Date().toISOString() })
          .eq("solicitud_id", solicitudId);
      }

      // Generar también la constancia de otorgamiento (plantilla editable)
      try {
        await imprimirConstanciaVacaciones("vacaciones_otorgamiento", solicitudId);
      } catch (e) {
        console.warn("No se pudo generar la constancia de otorgamiento", e);
      }

      toast({
        title: "Solicitud aprobada",
        description: "Se generó el comprobante y la constancia de otorgamiento",
      });

      fetchSolicitudes();
    } catch (error: any) {
      console.error('Error approving:', error);
      toast({
        title: "Error",
        description: "No se pudo aprobar la solicitud",
        variant: "destructive",
      });
    }
  };

  const resolverGerente = async (solicitudId: string, aprobar: boolean) => {
    if (!aprobar && !comentarios[solicitudId]) {
      toast({ title: "Comentario requerido", description: "Indicá el motivo del rechazo", variant: "destructive" });
      return;
    }
    const { data, error } = await (supabase as any).rpc("gerente_resolver_solicitud", {
      p_tipo: "vacaciones", p_id: solicitudId, p_aprobar: aprobar, p_comentario: comentarios[solicitudId] || null,
    });
    if (error || !data?.ok) {
      toast({ title: "Error", description: data?.error || error?.message || "No se pudo guardar", variant: "destructive" });
      return;
    }
    toast({ title: aprobar ? "Enviada a RRHH" : "Solicitud rechazada" });
    fetchSolicitudes();
  };

  const handleRechazar = async (solicitudId: string) => {
    const solR: any = solicitudes.find((x) => x.id === solicitudId);
    if (!esAdmin && solR?.etapa === "gerente") return resolverGerente(solicitudId, false);
    if (!comentarios[solicitudId]) {
      toast({
        title: "Comentario requerido",
        description: "Debes proporcionar un motivo para rechazar",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: empleado } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!empleado) throw new Error('No se encontró el empleado');

      const { error } = await supabase
        .from('solicitudes_vacaciones')
        .update({
          estado: 'rechazada' as const,
          aprobado_por: empleado.id,
          fecha_aprobacion: new Date().toISOString(),
          comentarios_aprobacion: comentarios[solicitudId],
        })
        .eq('id', solicitudId);

      if (error) throw error;

      toast({
        title: "Solicitud rechazada",
        description: "La solicitud ha sido rechazada",
      });

      fetchSolicitudes();
    } catch (error: any) {
      console.error('Error rejecting:', error);
      toast({
        title: "Error",
        description: "No se pudo rechazar la solicitud",
        variant: "destructive",
      });
    }
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
        <CardTitle>Solicitudes Pendientes</CardTitle>
        <CardDescription>
          {rol === 'admin_rrhh' ? 'Todas las solicitudes' : 'Solicitudes de tu sucursal'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {solicitudes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay solicitudes pendientes de aprobación
            </p>
          ) : (
            solicitudes.map((solicitud) => (
              <div key={solicitud.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {solicitud.empleado.nombre} {solicitud.empleado.apellido}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {solicitud.empleado.email}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(solicitud.fecha_inicio), "d 'de' MMMM", { locale: es })} -{" "}
                      {format(new Date(solicitud.fecha_fin), "d 'de' MMMM", { locale: es })}
                    </div>
                    {solicitud.motivo && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Motivo: {solicitud.motivo}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="secondary">{solicitud.estado}</Badge>
                    {(solicitud as any).etapa === "gerente" && <Badge variant="outline">Esperando gerente</Badge>}
                    {(solicitud as any).etapa === "rrhh" && <Badge variant="outline">Esperando RRHH</Badge>}
                    {(solicitud as any).comentario_gerente && (
                      <p className="text-xs text-muted-foreground max-w-[220px] text-right">Gerente: {(solicitud as any).comentario_gerente}</p>
                    )}
                  </div>
                </div>

                {/* Plan de cobertura de la sucursal */}
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    <span className="text-sm font-medium">Cobertura de esos días</span>
                    {coberturas[solicitud.id] ? (
                      <Badge
                        variant={
                          coberturas[solicitud.id].estado === "aprobada" ? "default" : "secondary"
                        }
                      >
                        {COBERTURA_ESTADO_LABEL[coberturas[solicitud.id].estado] ??
                          coberturas[solicitud.id].estado}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Sin cargar
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto"
                      onClick={() => setCoberturaAbierta(solicitud)}
                    >
                      {esAdmin ? "Ver cobertura" : "Definir cobertura"}
                    </Button>
                  </div>

                  {coberturas[solicitud.id]?.dias?.length ? (
                    <div className="space-y-1">
                      {coberturas[solicitud.id].dias.map((d) => (
                        <p key={d.fecha} className="text-xs text-muted-foreground">
                          <span className="capitalize">
                            {format(new Date(d.fecha + "T00:00:00"), "EEEE d/MM", { locale: es })}
                          </span>
                          {" · "}
                          {COBERTURA_TIPO_LABEL[d.tipo as keyof typeof COBERTURA_TIPO_LABEL] ?? d.tipo}
                          {d.empleados ? ` · ${d.empleados.apellido}, ${d.empleados.nombre}` : ""}
                          {d.hora_entrada && d.hora_salida
                            ? ` · ${String(d.hora_entrada).slice(0, 5)} a ${String(d.hora_salida).slice(0, 5)}`
                            : ""}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {esAdmin
                        ? "El encargado todavía no indicó cómo cubre esos días."
                        : "Indicá día por día quién cubre o qué cambio de horario proponés."}
                    </p>
                  )}

                  {coberturas[solicitud.id]?.comentario_encargado && (
                    <p className="text-xs">
                      <span className="font-medium">Encargado:</span>{" "}
                      {coberturas[solicitud.id].comentario_encargado}
                    </p>
                  )}
                  {coberturas[solicitud.id]?.comentario_rrhh && (
                    <p className="text-xs">
                      <span className="font-medium">RRHH sugirió:</span>{" "}
                      {coberturas[solicitud.id].comentario_rrhh}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Comentarios</Label>
                  <Textarea
                    placeholder="Añade comentarios opcionales"
                    value={comentarios[solicitud.id] || ""}
                    onChange={(e) =>
                      setComentarios({ ...comentarios, [solicitud.id]: e.target.value })
                    }
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  {esAdmin && (
                    <Button onClick={() => handleAprobar(solicitud.id)} className="flex-1">
                      <Check className="h-4 w-4 mr-2" />
                      Aprobar
                    </Button>
                  )}
                  {!esAdmin && (solicitud as any).etapa === "gerente" && (
                    <>
                      <Button variant="outline" className="flex-1" onClick={() => setCoberturaAbierta(solicitud)}>
                        <ClipboardList className="h-4 w-4 mr-2" />
                        Cobertura
                      </Button>
                      <Button className="flex-1" onClick={() => {
                        const c = coberturas[solicitud.id];
                        if (!c || c.estado === "borrador") {
                          toast({ title: "Falta la cobertura", description: "Cargá y enviá cómo vas a cubrir esos días antes de aprobar.", variant: "destructive" });
                          setCoberturaAbierta(solicitud);
                          return;
                        }
                        resolverGerente(solicitud.id, true);
                      }}>
                        <Check className="h-4 w-4 mr-2" />
                        Aprobar y enviar a RRHH
                      </Button>
                    </>
                  )}
                  {!esAdmin && (solicitud as any).etapa !== "gerente" && (
                    <Button variant="outline" className="flex-1" onClick={() => setCoberturaAbierta(solicitud)}>
                      <ClipboardList className="h-4 w-4 mr-2" />
                      Ver / editar cobertura
                    </Button>
                  )}
                  <Button
                    onClick={() => handleRechazar(solicitud.id)}
                    variant="destructive"
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rechazar
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {coberturaAbierta && (
          <CoberturaVacacionesDialog
            open={!!coberturaAbierta}
            onOpenChange={(v) => !v && setCoberturaAbierta(null)}
            solicitudId={coberturaAbierta.id}
            empleadoNombre={`${coberturaAbierta.empleado.nombre} ${coberturaAbierta.empleado.apellido}`}
            fechaInicio={coberturaAbierta.fecha_inicio}
            fechaFin={coberturaAbierta.fecha_fin}
            sucursalId={coberturaAbierta.empleado_sucursal_id ?? sucursalId ?? null}
            modoRRHH={esAdmin}
            onSaved={fetchSolicitudes}
          />
        )}
      </CardContent>
    </Card>
  );
}
