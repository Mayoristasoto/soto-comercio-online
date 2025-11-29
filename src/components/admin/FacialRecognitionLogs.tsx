import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, XCircle, AlertCircle, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface FacialLog {
  id: string;
  created_at: string;
  user_id: string | null;
  empleado_id: string | null;
  event_type: string;
  success: boolean;
  confidence_score: number | null;
  error_message: string | null;
  descriptor_valid: boolean | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  empleado_nombre?: string;
  empleado_apellido?: string;
  empleado_email?: string;
}

export function FacialRecognitionLogs({ empleadoId }: { empleadoId?: string }) {
  const [logs, setLogs] = useState<FacialLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [empleadoId]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('facial_recognition_logs')
        .select(`
          *,
          empleados!facial_recognition_logs_empleado_id_fkey(
            nombre,
            apellido,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (empleadoId) {
        query = query.eq('empleado_id', empleadoId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedLogs = data?.map((log: any) => ({
        ...log,
        empleado_nombre: log.empleados?.nombre,
        empleado_apellido: log.empleados?.apellido,
        empleado_email: log.empleados?.email
      })) || [];

      setLogs(formattedLogs);
    } catch (error) {
      console.error('Error loading facial recognition logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventBadge = (log: FacialLog) => {
    if (log.success) {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Exitoso
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Fallido
        </Badge>
      );
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      'kiosk_login_success': 'Login Kiosco',
      'kiosk_login_error': 'Error Login',
      'login_attempt': 'Intento Login',
      'registration': 'Registro',
      'rejection': 'Rechazo'
    };
    return labels[eventType] || eventType;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logs de Reconocimiento Facial</CardTitle>
        <CardDescription>
          {empleadoId 
            ? "Historial de autenticación facial para este empleado"
            : "Historial completo de intentos de autenticación facial en kiosco"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No hay logs de reconocimiento facial registrados
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <Card key={log.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-full ${log.success ? 'bg-success/10' : 'bg-destructive/10'}`}>
                        {log.success ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getEventBadge(log)}
                          <Badge variant="outline">{getEventTypeLabel(log.event_type)}</Badge>
                          {log.descriptor_valid !== null && (
                            <Badge variant={log.descriptor_valid ? "default" : "destructive"}>
                              {log.descriptor_valid ? "Descriptor Válido" : "Descriptor Inválido"}
                            </Badge>
                          )}
                          {log.confidence_score !== null && (
                            <Badge variant="secondary">
                              Confianza: {(log.confidence_score * 100).toFixed(1)}%
                            </Badge>
                          )}
                        </div>

                        {(log.empleado_nombre || log.empleado_apellido) && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {log.empleado_nombre} {log.empleado_apellido}
                            </span>
                            {log.empleado_email && (
                              <span className="text-muted-foreground">
                                ({log.empleado_email})
                              </span>
                            )}
                          </div>
                        )}

                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>
                            {format(new Date(log.created_at), "PPp", { locale: es })}
                          </div>
                          {log.ip_address && (
                            <div>IP: {log.ip_address}</div>
                          )}
                          {log.error_message && (
                            <div className="flex items-start gap-2 text-destructive mt-2">
                              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{log.error_message}</span>
                            </div>
                          )}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-primary hover:underline">
                                Ver metadatos
                              </summary>
                              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
