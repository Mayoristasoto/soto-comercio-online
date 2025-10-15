import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, X, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportedSchedule {
  empleado_legajo: string;
  empleado_nombre: string;
  turno_nombre: string;
  fecha_inicio: string;
  fecha_fin?: string;
}

interface ScheduleImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export default function ScheduleImport({ open, onOpenChange, onImportComplete }: ScheduleImportProps) {
  const [schedules, setSchedules] = useState<ImportedSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const template = [
      {
        'Legajo Empleado': '12345',
        'Nombre Empleado': 'Juan Pérez',
        'Nombre Turno': 'Turno Mañana',
        'Fecha Inicio': '2025-01-15',
        'Fecha Fin (Opcional)': ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Horarios");
    
    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 20 }
    ];

    XLSX.writeFile(wb, "plantilla_importacion_horarios.xlsx");
    
    toast({
      title: "Plantilla descargada",
      description: "Completa la plantilla con los datos de los horarios",
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const importedSchedules: ImportedSchedule[] = data.map((row: any) => ({
          empleado_legajo: row['Legajo Empleado']?.toString().trim() || '',
          empleado_nombre: row['Nombre Empleado']?.toString().trim() || '',
          turno_nombre: row['Nombre Turno']?.toString().trim() || '',
          fecha_inicio: row['Fecha Inicio']?.toString().trim() || '',
          fecha_fin: row['Fecha Fin (Opcional)']?.toString().trim() || undefined
        }));

        setSchedules(importedSchedules);
        toast({
          title: "Archivo cargado",
          description: `${importedSchedules.length} asignación(es) de horario encontrada(s)`,
        });
      } catch (error) {
        console.error('Error al leer el archivo:', error);
        toast({
          title: "Error",
          description: "No se pudo leer el archivo Excel",
          variant: "destructive",
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const updateSchedule = (index: number, field: keyof ImportedSchedule, value: string) => {
    const updated = [...schedules];
    updated[index] = { ...updated[index], [field]: value };
    setSchedules(updated);
  };

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const validateSchedules = (): boolean => {
    for (const schedule of schedules) {
      if (!schedule.empleado_legajo || !schedule.turno_nombre || !schedule.fecha_inicio) {
        toast({
          title: "Error de validación",
          description: "Todos los horarios deben tener legajo de empleado, nombre de turno y fecha de inicio",
          variant: "destructive",
        });
        return false;
      }

      // Validar formato de fecha
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(schedule.fecha_inicio)) {
        toast({
          title: "Error de validación",
          description: `Fecha de inicio inválida para ${schedule.empleado_nombre}. Use formato YYYY-MM-DD`,
          variant: "destructive",
        });
        return false;
      }

      if (schedule.fecha_fin && !dateRegex.test(schedule.fecha_fin)) {
        toast({
          title: "Error de validación",
          description: `Fecha fin inválida para ${schedule.empleado_nombre}. Use formato YYYY-MM-DD`,
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const handleImport = async () => {
    if (!validateSchedules()) return;

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const schedule of schedules) {
      try {
        // Buscar empleado por legajo
        const { data: empleado, error: empleadoError } = await supabase
          .from('empleados')
          .select('id')
          .eq('legajo', schedule.empleado_legajo)
          .eq('activo', true)
          .single();

        if (empleadoError || !empleado) {
          console.error(`Empleado con legajo ${schedule.empleado_legajo} no encontrado`);
          errorCount++;
          continue;
        }

        // Buscar turno por nombre
        const { data: turno, error: turnoError } = await supabase
          .from('fichado_turnos')
          .select('id')
          .eq('nombre', schedule.turno_nombre)
          .eq('activo', true)
          .single();

        if (turnoError || !turno) {
          console.error(`Turno ${schedule.turno_nombre} no encontrado`);
          errorCount++;
          continue;
        }

        // Desactivar asignación anterior si existe
        await supabase
          .from('empleado_turnos')
          .update({ activo: false, fecha_fin: new Date().toISOString().split('T')[0] })
          .eq('empleado_id', empleado.id)
          .eq('activo', true);

        // Crear nueva asignación
        const { error: insertError } = await supabase
          .from('empleado_turnos')
          .insert({
            empleado_id: empleado.id,
            turno_id: turno.id,
            fecha_inicio: schedule.fecha_inicio,
            fecha_fin: schedule.fecha_fin || null,
            activo: true
          });

        if (insertError) {
          console.error(`Error asignando horario a ${schedule.empleado_nombre}:`, insertError);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`Error procesando ${schedule.empleado_nombre}:`, error);
        errorCount++;
      }
    }

    setLoading(false);

    if (successCount > 0) {
      toast({
        title: "Importación completada",
        description: `${successCount} horario(s) importado(s) exitosamente${errorCount > 0 ? `, ${errorCount} error(es)` : ''}`,
      });
      setSchedules([]);
      onImportComplete();
      onOpenChange(false);
    } else {
      toast({
        title: "Error en la importación",
        description: "No se pudieron importar los horarios",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Horarios desde Excel</DialogTitle>
          <DialogDescription>
            Descarga la plantilla, complétala con los datos y súbela para importar las asignaciones de horarios
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={downloadTemplate}
              variant="outline"
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar Plantilla
            </Button>

            <div className="flex-1">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
            </div>
          </div>

          {schedules.length > 0 && (
            <>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Legajo</TableHead>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Turno</TableHead>
                      <TableHead>Fecha Inicio</TableHead>
                      <TableHead>Fecha Fin</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((schedule, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={schedule.empleado_legajo}
                            onChange={(e) => updateSchedule(index, 'empleado_legajo', e.target.value)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={schedule.empleado_nombre}
                            onChange={(e) => updateSchedule(index, 'empleado_nombre', e.target.value)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={schedule.turno_nombre}
                            onChange={(e) => updateSchedule(index, 'turno_nombre', e.target.value)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={schedule.fecha_inicio}
                            onChange={(e) => updateSchedule(index, 'fecha_inicio', e.target.value)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={schedule.fecha_fin || ''}
                            onChange={(e) => updateSchedule(index, 'fecha_fin', e.target.value)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSchedule(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={loading || schedules.length === 0}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {loading ? 'Importando...' : `Importar ${schedules.length} Horario(s)`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
