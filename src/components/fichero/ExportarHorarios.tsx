import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, FileSpreadsheet, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

export const ExportarHorarios = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [semanaSeleccionada, setSemanaSeleccionada] = useState<string>('actual');

  const getSemanaRango = () => {
    const hoy = new Date();
    let inicio, fin;

    if (semanaSeleccionada === 'actual') {
      inicio = startOfWeek(hoy, { weekStartsOn: 1 });
      fin = endOfWeek(hoy, { weekStartsOn: 1 });
    } else if (semanaSeleccionada === 'siguiente') {
      const siguienteSemana = new Date(hoy);
      siguienteSemana.setDate(hoy.getDate() + 7);
      inicio = startOfWeek(siguienteSemana, { weekStartsOn: 1 });
      fin = endOfWeek(siguienteSemana, { weekStartsOn: 1 });
    } else {
      const semanaAnterior = new Date(hoy);
      semanaAnterior.setDate(hoy.getDate() - 7);
      inicio = startOfWeek(semanaAnterior, { weekStartsOn: 1 });
      fin = endOfWeek(semanaAnterior, { weekStartsOn: 1 });
    }

    return { inicio, fin };
  };

  const exportarAExcel = async () => {
    try {
      setLoading(true);

      const { inicio, fin } = getSemanaRango();
      const diasSemana = eachDayOfInterval({ start: inicio, end: fin });

      // Cargar turnos y empleados
      const { data: turnos, error } = await supabase
        .from('fichado_turnos')
        .select(`
          *,
          empleado_turnos(
            empleado_id,
            empleados(
              nombre,
              apellido,
              legajo,
              sucursales(nombre)
            )
          )
        `)
        .eq('activo', true);

      if (error) throw error;

      // Preparar datos para Excel
      const datosExcel: any[] = [];

      // Agregar fila de encabezados
      const encabezados = [
        'Legajo',
        'Empleado',
        'Sucursal',
        'Turno',
        ...diasSemana.map((dia) => format(dia, 'EEE dd/MM', { locale: es })),
      ];
      datosExcel.push(encabezados);

      // Crear un mapa de empleados y sus turnos
      const empleadosTurnos = new Map<string, any>();

      turnos?.forEach((turno: any) => {
        turno.empleado_turnos?.forEach((et: any) => {
          const empleadoId = et.empleado_id;
          const empleado = et.empleados;

          if (!empleadosTurnos.has(empleadoId)) {
            empleadosTurnos.set(empleadoId, {
              legajo: empleado.legajo || 'N/A',
              nombre: `${empleado.nombre} ${empleado.apellido}`,
              sucursal: empleado.sucursales?.nombre || 'N/A',
              turnos: [],
            });
          }

          empleadosTurnos.get(empleadoId).turnos.push(turno);
        });
      });

      // Generar filas por empleado
      Array.from(empleadosTurnos.values()).forEach((emp) => {
        // Agrupar turnos del empleado
        emp.turnos.forEach((turno: any) => {
          const fila = [
            emp.legajo,
            emp.nombre,
            emp.sucursal,
            turno.nombre,
          ];

          // Por cada día de la semana
          diasSemana.forEach((dia) => {
            const diaSemana = dia.getDay();
            
            // Verificar si el turno aplica a este día
            if (turno.dias_semana?.includes(diaSemana)) {
              const horarioEspecifico = turno.horarios_por_dia?.[diaSemana.toString()];
              const horaEntrada = horarioEspecifico?.hora_entrada || turno.hora_entrada;
              const horaSalida = horarioEspecifico?.hora_salida || turno.hora_salida;
              
              fila.push(`${horaEntrada} - ${horaSalida}`);
            } else {
              fila.push('-');
            }
          });

          datosExcel.push(fila);
        });
      });

      // Agregar fila de resumen
      datosExcel.push([]); // Fila vacía
      datosExcel.push(['RESUMEN']);
      datosExcel.push(['Total de empleados:', empleadosTurnos.size]);
      datosExcel.push(['Total de turnos:', turnos?.length || 0]);
      datosExcel.push(['Período:', `${format(inicio, 'dd/MM/yyyy')} - ${format(fin, 'dd/MM/yyyy')}`]);

      // Crear libro de Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(datosExcel);

      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 10 }, // Legajo
        { wch: 25 }, // Empleado
        { wch: 15 }, // Sucursal
        { wch: 15 }, // Turno
        ...diasSemana.map(() => ({ wch: 15 })), // Días
      ];
      ws['!cols'] = colWidths;

      // Agregar hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, 'Horarios');

      // Generar archivo
      const nombreArchivo = `Horarios_${format(inicio, 'dd-MM-yyyy')}_${format(fin, 'dd-MM-yyyy')}.xlsx`;
      XLSX.writeFile(wb, nombreArchivo);

      toast({
        title: 'Exportación exitosa',
        description: `Se descargó el archivo ${nombreArchivo}`,
      });
    } catch (error) {
      console.error('Error exportando:', error);
      toast({
        title: 'Error',
        description: 'No se pudo exportar los horarios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Exportar Horarios a Excel
        </CardTitle>
        <CardDescription>
          Descarga los horarios de la semana en formato Excel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">
              Seleccionar Semana
            </label>
            <Select value={semanaSeleccionada} onValueChange={setSemanaSeleccionada}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anterior">Semana Anterior</SelectItem>
                <SelectItem value="actual">Semana Actual</SelectItem>
                <SelectItem value="siguiente">Semana Siguiente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={exportarAExcel}
            disabled={loading}
            size="lg"
          >
            {loading ? (
              <>Exportando...</>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Descargar Excel
              </>
            )}
          </Button>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Contenido del archivo:
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
            <li>Legajo y nombre de cada empleado</li>
            <li>Sucursal asignada</li>
            <li>Horarios por día de la semana</li>
            <li>Turnos con horarios específicos aplicados</li>
            <li>Resumen con totales</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
