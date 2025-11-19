import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, User, Activity, Shield } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AuditLog {
  id: string;
  empleado_accedido_id: string;
  usuario_acceso_id: string | null;
  tipo_acceso: string;
  datos_accedidos: string[] | null;
  timestamp_acceso: string;
  ip_address: unknown;
  user_agent: string | null;
  empleado_nombre?: string;
  usuario_nombre?: string;
}

export function AuditLogViewer({ empleadoId }: { empleadoId?: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditLogs();
  }, [empleadoId]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('empleados_audit_log')
        .select(`
          *,
          empleado:empleados!empleados_audit_log_empleado_accedido_id_fkey(nombre, apellido),
          usuario:empleados!empleados_audit_log_usuario_acceso_id_fkey(nombre, apellido)
        `)
        .order('timestamp_acceso', { ascending: false })
        .limit(100);

      if (empleadoId) {
        query = query.eq('empleado_accedido_id', empleadoId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedLogs = data?.map((log: any) => ({
        ...log,
        empleado_nombre: log.empleado ? `${log.empleado.nombre} ${log.empleado.apellido}` : 'N/A',
        usuario_nombre: log.usuario ? `${log.usuario.nombre} ${log.usuario.apellido}` : 'Sistema',
      })) || [];

      setLogs(formattedLogs);
    } catch (error) {
      console.error('Error cargando logs de auditoría:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAccessTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'lectura': 'bg-blue-500/10 text-blue-700 border-blue-500/20',
      'modificacion': 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
      'eliminacion': 'bg-red-500/10 text-red-700 border-red-500/20',
      'creacion': 'bg-green-500/10 text-green-700 border-green-500/20',
    };
    
    return (
      <Badge className={colors[type] || colors.lectura}>
        {type}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center p-8">Cargando logs de auditoría...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Auditoría de Accesos</CardTitle>
        </div>
        <CardDescription>
          Registro detallado de todos los accesos a datos de empleados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Activity className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getAccessTypeBadge(log.tipo_acceso)}
                    <span className="text-sm font-medium">
                      {log.usuario_nombre}
                    </span>
                    <span className="text-sm text-muted-foreground">accedió a</span>
                    <span className="text-sm font-medium">
                      {log.empleado_nombre}
                    </span>
                  </div>
                  {log.datos_accedidos && log.datos_accedidos.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {log.datos_accedidos.map((dato, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {dato}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(log.timestamp_acceso), "PPp", { locale: es })}
                    </div>
                    {log.ip_address && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {JSON.stringify(log.ip_address)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
