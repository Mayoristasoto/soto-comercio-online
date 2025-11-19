import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Calendar, Users, Shield, Activity } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from 'xlsx';

type ReportType = 'accesos' | 'cambios' | 'asistencia' | 'documentos';
type ReportPeriod = 'mes' | 'trimestre' | 'anio';

export function ComplianceReports() {
  const [reportType, setReportType] = useState<ReportType>('accesos');
  const [period, setPeriod] = useState<ReportPeriod>('mes');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalAccesos: 0,
    accesosPorTipo: {} as Record<string, number>,
    usuariosActivos: 0,
  });

  useEffect(() => {
    loadStats();
  }, [period]);

  const loadStats = async () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'mes':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'trimestre':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        endDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
        break;
      case 'anio':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
    }

    try {
      const { data, error } = await supabase
        .from('empleados_audit_log')
        .select('tipo_acceso, usuario_acceso_id')
        .gte('timestamp_acceso', startDate.toISOString())
        .lte('timestamp_acceso', endDate.toISOString());

      if (error) throw error;

      const accesosPorTipo: Record<string, number> = {};
      const usuariosUnicos = new Set<string>();

      data?.forEach((log) => {
        accesosPorTipo[log.tipo_acceso] = (accesosPorTipo[log.tipo_acceso] || 0) + 1;
        if (log.usuario_acceso_id) {
          usuariosUnicos.add(log.usuario_acceso_id);
        }
      });

      setStats({
        totalAccesos: data?.length || 0,
        accesosPorTipo,
        usuariosActivos: usuariosUnicos.size,
      });
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      switch (period) {
        case 'mes':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'trimestre':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          endDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
          break;
        case 'anio':
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          break;
      }

      let data: any[] = [];
      let fileName = '';

      switch (reportType) {
        case 'accesos':
          const { data: auditData, error: auditError } = await supabase
            .from('empleados_audit_log')
            .select(`
              *,
              empleado:empleados!empleados_audit_log_empleado_accedido_id_fkey(nombre, apellido),
              usuario:empleados!empleados_audit_log_usuario_acceso_id_fkey(nombre, apellido)
            `)
            .gte('timestamp_acceso', startDate.toISOString())
            .lte('timestamp_acceso', endDate.toISOString())
            .order('timestamp_acceso', { ascending: false });

          if (auditError) throw auditError;

          data = auditData?.map((log: any) => ({
            'Fecha': format(new Date(log.timestamp_acceso), 'PPp', { locale: es }),
            'Tipo Acceso': log.tipo_acceso,
            'Empleado Accedido': log.empleado ? `${log.empleado.nombre} ${log.empleado.apellido}` : 'N/A',
            'Usuario': log.usuario ? `${log.usuario.nombre} ${log.usuario.apellido}` : 'Sistema',
            'Datos Accedidos': log.datos_accedidos?.join(', ') || 'N/A',
            'IP Address': JSON.stringify(log.ip_address) || 'N/A',
          })) || [];

          fileName = `Reporte_Accesos_${format(now, 'yyyy-MM-dd')}.xlsx`;
          break;

        case 'cambios':
          const { data: authLogs, error: authError } = await supabase
            .from('auth_logs')
            .select('*')
            .gte('timestamp', startDate.toISOString())
            .lte('timestamp', endDate.toISOString())
            .order('timestamp', { ascending: false });

          if (authError) throw authError;

          data = authLogs?.map((log) => ({
            'Fecha': format(new Date(log.timestamp), 'PPp', { locale: es }),
            'Evento': log.evento,
            'Email': log.email,
            'Exitoso': log.exitoso ? 'Sí' : 'No',
            'Método': log.metodo || 'N/A',
            'IP Address': JSON.stringify(log.ip_address) || 'N/A',
            'Mensaje Error': log.mensaje_error || 'N/A',
          })) || [];

          fileName = `Reporte_Cambios_${format(now, 'yyyy-MM-dd')}.xlsx`;
          break;

        case 'asistencia':
          const { data: fichajesData, error: fichajesError } = await supabase
            .from('fichajes')
            .select(`
              *,
              empleado:empleados(nombre, apellido, legajo)
            `)
            .gte('fecha', format(startDate, 'yyyy-MM-dd'))
            .lte('fecha', format(endDate, 'yyyy-MM-dd'))
            .order('fecha', { ascending: false });

          if (fichajesError) throw fichajesError;

          data = fichajesData?.map((fichaje: any) => ({
            'Fecha': fichaje.fecha,
            'Empleado': fichaje.empleado ? `${fichaje.empleado.nombre} ${fichaje.empleado.apellido}` : 'N/A',
            'Legajo': fichaje.empleado?.legajo || 'N/A',
            'Entrada': fichaje.hora_entrada || 'N/A',
            'Salida': fichaje.hora_salida || 'N/A',
            'Horas Trabajadas': fichaje.horas_trabajadas || 'N/A',
            'Estado': fichaje.estado || 'N/A',
          })) || [];

          fileName = `Reporte_Asistencia_${format(now, 'yyyy-MM-dd')}.xlsx`;
          break;

        case 'documentos':
          const { data: docsData, error: docsError } = await supabase
            .from('confirmaciones_lectura')
            .select(`
              *,
              empleado:empleados(nombre, apellido, legajo),
              documento:documentos_obligatorios(titulo, tipo_documento)
            `)
            .gte('fecha_confirmacion', startDate.toISOString())
            .lte('fecha_confirmacion', endDate.toISOString())
            .order('fecha_confirmacion', { ascending: false });

          if (docsError) throw docsError;

          data = docsData?.map((conf: any) => ({
            'Fecha Confirmación': format(new Date(conf.fecha_confirmacion), 'PPp', { locale: es }),
            'Empleado': conf.empleado ? `${conf.empleado.nombre} ${conf.empleado.apellido}` : 'N/A',
            'Legajo': conf.empleado?.legajo || 'N/A',
            'Documento': conf.documento?.titulo || 'N/A',
            'Tipo Documento': conf.documento?.tipo_documento || 'N/A',
            'IP Confirmación': JSON.stringify(conf.ip_confirmacion) || 'N/A',
          })) || [];

          fileName = `Reporte_Documentos_${format(now, 'yyyy-MM-dd')}.xlsx`;
          break;
      }

      // Generar Excel
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
      XLSX.writeFile(workbook, fileName);

      toast.success('Reporte generado correctamente');
    } catch (error: any) {
      console.error('Error generando reporte:', error);
      toast.error(error.message || 'Error al generar reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Reportes de Compliance</CardTitle>
          </div>
          <CardDescription>
            Genera reportes detallados para auditorías y cumplimiento normativo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Reporte</label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accesos">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Auditoría de Accesos
                    </div>
                  </SelectItem>
                  <SelectItem value="cambios">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Registro de Cambios
                    </div>
                  </SelectItem>
                  <SelectItem value="asistencia">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Asistencia
                    </div>
                  </SelectItem>
                  <SelectItem value="documentos">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documentos Firmados
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes">Mes actual</SelectItem>
                  <SelectItem value="trimestre">Trimestre actual</SelectItem>
                  <SelectItem value="anio">Año actual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={generateReport} disabled={loading} className="w-full gap-2">
            <Download className="h-4 w-4" />
            {loading ? 'Generando...' : 'Generar Reporte'}
          </Button>
        </CardContent>
      </Card>

      {reportType === 'accesos' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total de Accesos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAccesos}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Usuarios Activos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.usuariosActivos}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Tipos de Acceso</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(stats.accesosPorTipo).map(([tipo, count]) => (
                  <div key={tipo} className="flex justify-between text-sm">
                    <span className="capitalize">{tipo}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
