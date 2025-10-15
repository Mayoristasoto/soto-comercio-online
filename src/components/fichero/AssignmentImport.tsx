import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportedAssignment {
  empleado_legajo: string;
  empleado_nombre: string;
  turno_nombre: string;
  fecha_inicio: string;
  fecha_fin?: string;
}

interface AssignmentImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export default function AssignmentImport({ open, onOpenChange, onImportComplete }: AssignmentImportProps) {
  const [assignments, setAssignments] = useState<ImportedAssignment[]>([]);
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
      },
      {
        'Legajo Empleado': '12346',
        'Nombre Empleado': 'María González',
        'Nombre Turno': 'Turno Tarde',
        'Fecha Inicio': '2025-01-15',
        'Fecha Fin (Opcional)': '2025-03-15'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Asignaciones");
    
    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 20 }
    ];

    XLSX.writeFile(wb, "plantilla_asignaciones_horarios.xlsx");
    
    toast({
      title: "Plantilla descargada",
      description: "Completa la plantilla con las asignaciones de empleados a horarios",
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

        const importedAssignments: ImportedAssignment[] = data.map((row: any) => ({
          empleado_legajo: row['Legajo Empleado']?.toString().trim() || '',
          empleado_nombre: row['Nombre Empleado']?.toString().trim() || '',
          turno_nombre: row['Nombre Turno']?.toString().trim() || '',
          fecha_inicio: row['Fecha Inicio']?.toString().trim() || '',
          fecha_fin: row['Fecha Fin (Opcional)']?.toString().trim() || undefined
        }));

        setAssignments(importedAssignments);
        toast({
          title: "Archivo cargado",
          description: `${importedAssignments.length} asignación(es) encontrada(s)`,
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

  const updateAssignment = (index: number, field: keyof ImportedAssignment, value: string) => {
    const updated = [...assignments];
    updated[index] = { ...updated[index], [field]: value };
    setAssignments(updated);
  };

  const removeAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const validateAssignments = (): boolean => {
    for (const assignment of assignments) {
      if (!assignment.empleado_legajo || !assignment.turno_nombre || !assignment.fecha_inicio) {
        toast({
          title: "Error de validación",
          description: "Todas las asignaciones deben tener legajo de empleado, nombre de turno y fecha de inicio",
          variant: "destructive",
        });
        return false;
      }

      // Validar formato de fecha
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(assignment.fecha_inicio)) {
        toast({
          title: "Error de validación",
          description: `Fecha de inicio inválida para ${assignment.empleado_nombre}. Use formato YYYY-MM-DD`,
          variant: "destructive",
        });
        return false;
      }

      if (assignment.fecha_fin && !dateRegex.test(assignment.fecha_fin)) {
        toast({
          title: "Error de validación",
          description: `Fecha fin inválida para ${assignment.empleado_nombre}. Use formato YYYY-MM-DD`,
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const handleImport = async () => {
    if (!validateAssignments()) return;

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const assignment of assignments) {
      try {
        // Buscar empleado por legajo
        const { data: empleado, error: empleadoError } = await supabase
          .from('empleados')
          .select('id')
          .eq('legajo', assignment.empleado_legajo)
          .eq('activo', true)
          .maybeSingle();

        if (empleadoError || !empleado) {
          console.error(`Empleado con legajo ${assignment.empleado_legajo} no encontrado`);
          errorCount++;
          continue;
        }

        // Buscar turno por nombre
        const { data: turno, error: turnoError } = await supabase
          .from('fichado_turnos')
          .select('id')
          .eq('nombre', assignment.turno_nombre)
          .eq('activo', true)
          .maybeSingle();

        if (turnoError || !turno) {
          console.error(`Turno ${assignment.turno_nombre} no encontrado`);
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
            fecha_inicio: assignment.fecha_inicio,
            fecha_fin: assignment.fecha_fin || null,
            activo: true
          });

        if (insertError) {
          console.error(`Error asignando horario a ${assignment.empleado_nombre}:`, insertError);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`Error procesando ${assignment.empleado_nombre}:`, error);
        errorCount++;
      }
    }

    setLoading(false);

    if (successCount > 0) {
      toast({
        title: "Importación completada",
        description: `${successCount} asignación(es) importada(s) exitosamente${errorCount > 0 ? `, ${errorCount} error(es)` : ''}`,
      });
      setAssignments([]);
      onImportComplete();
      onOpenChange(false);
    } else {
      toast({
        title: "Error en la importación",
        description: "No se pudieron importar las asignaciones",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Asignaciones desde Excel</DialogTitle>
          <DialogDescription>
            Descarga la plantilla, complétala con las asignaciones de empleados a horarios y súbela para importar
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

          {assignments.length > 0 && (
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
                    {assignments.map((assignment, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={assignment.empleado_legajo}
                            onChange={(e) => updateAssignment(index, 'empleado_legajo', e.target.value)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={assignment.empleado_nombre}
                            onChange={(e) => updateAssignment(index, 'empleado_nombre', e.target.value)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={assignment.turno_nombre}
                            onChange={(e) => updateAssignment(index, 'turno_nombre', e.target.value)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={assignment.fecha_inicio}
                            onChange={(e) => updateAssignment(index, 'fecha_inicio', e.target.value)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={assignment.fecha_fin || ''}
                            onChange={(e) => updateAssignment(index, 'fecha_fin', e.target.value)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAssignment(index)}
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
                  disabled={loading || assignments.length === 0}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {loading ? 'Importando...' : `Importar ${assignments.length} Asignación(es)`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
