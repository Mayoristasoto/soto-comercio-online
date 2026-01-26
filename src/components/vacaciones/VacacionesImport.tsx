import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Download, Upload, X } from "lucide-react";
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface VacacionesImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ImportedVacacion {
  empleado_legajo: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo?: string;
  estado?: string;
}

export function VacacionesImport({ open, onOpenChange, onImportComplete }: VacacionesImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<ImportedVacacion[]>([]);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const template = [
      {
        empleado_legajo: "12345",
        fecha_inicio: "2024-01-15",
        fecha_fin: "2024-01-20",
        motivo: "Vacaciones anuales 2024",
        estado: "gozadas"
      },
      {
        empleado_legajo: "67890",
        fecha_inicio: "2023-07-01",
        fecha_fin: "2023-07-14",
        motivo: "Vacaciones gozadas 2023",
        estado: "gozadas"
      },
      {
        empleado_legajo: "11111",
        fecha_inicio: "2024-12-20",
        fecha_fin: "2024-12-31",
        motivo: "Vacaciones pendientes",
        estado: "pendiente"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 30 },
      { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vacaciones");
    XLSX.writeFile(wb, "plantilla_vacaciones.xlsx");

    toast({
      title: "Plantilla descargada",
      description: "Completa la plantilla y súbela para importar las vacaciones",
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      const vacaciones: ImportedVacacion[] = jsonData.map((row) => ({
        empleado_legajo: String(row.empleado_legajo || '').trim(),
        fecha_inicio: String(row.fecha_inicio || '').trim(),
        fecha_fin: String(row.fecha_fin || '').trim(),
        motivo: row.motivo ? String(row.motivo).trim() : undefined,
        estado: row.estado ? String(row.estado).trim() : 'pendiente'
      }));

      // Validar datos
      const errors: string[] = [];
      vacaciones.forEach((vac, index) => {
        if (!vac.empleado_legajo) {
          errors.push(`Fila ${index + 2}: Legajo de empleado es requerido`);
        }
        if (!vac.fecha_inicio) {
          errors.push(`Fila ${index + 2}: Fecha de inicio es requerida`);
        }
        if (!vac.fecha_fin) {
          errors.push(`Fila ${index + 2}: Fecha de fin es requerida`);
        }
        
        // Validar formato de fecha
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (vac.fecha_inicio && !dateRegex.test(vac.fecha_inicio)) {
          errors.push(`Fila ${index + 2}: Fecha de inicio debe estar en formato YYYY-MM-DD`);
        }
        if (vac.fecha_fin && !dateRegex.test(vac.fecha_fin)) {
          errors.push(`Fila ${index + 2}: Fecha de fin debe estar en formato YYYY-MM-DD`);
        }
        
        // Validar estado
        const estadosValidos = ['pendiente', 'aprobada', 'rechazada', 'gozadas'];
        if (vac.estado && !estadosValidos.includes(vac.estado.toLowerCase())) {
          errors.push(`Fila ${index + 2}: Estado debe ser pendiente, aprobada, rechazada o gozadas`);
        }
      });

      if (errors.length > 0) {
        toast({
          title: "Errores en el archivo",
          description: errors.join('\n'),
          variant: "destructive",
        });
        return;
      }

      setPreviewData(vacaciones);
      toast({
        title: "Archivo procesado",
        description: `${vacaciones.length} vacaciones listas para importar`,
      });
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar el archivo Excel",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast({
        title: "Error",
        description: "No hay datos para importar",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const vacacion of previewData) {
        try {
          // Buscar empleado por legajo
          const { data: empleado, error: empleadoError } = await supabase
            .from('empleados')
            .select('id')
            .eq('legajo', vacacion.empleado_legajo)
            .eq('activo', true)
            .single();

          if (empleadoError || !empleado) {
            console.error(`Empleado no encontrado: ${vacacion.empleado_legajo}`);
            errorCount++;
            continue;
          }

          // Validar estado
          const estadoValido = ['pendiente', 'aprobada', 'rechazada', 'cancelada', 'gozadas'].includes(
            vacacion.estado?.toLowerCase() || ''
          ) ? (vacacion.estado?.toLowerCase() as 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada' | 'gozadas') : 'pendiente';

          // Insertar solicitud de vacaciones
          const { error: insertError } = await supabase
            .from('solicitudes_vacaciones')
            .insert([{
              empleado_id: empleado.id,
              fecha_inicio: vacacion.fecha_inicio,
              fecha_fin: vacacion.fecha_fin,
              motivo: vacacion.motivo || 'Migración de datos',
              estado: estadoValido
            }]);

          if (insertError) {
            console.error('Error insertando vacación:', insertError);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error('Error procesando vacación:', error);
          errorCount++;
        }
      }

      toast({
        title: "Importación completada",
        description: `${successCount} vacaciones importadas correctamente. ${errorCount} errores.`,
        variant: errorCount > 0 ? "destructive" : "default",
      });

      if (successCount > 0) {
        onImportComplete();
        onOpenChange(false);
        setPreviewData([]);
        setFile(null);
      }
    } catch (error) {
      console.error('Error importing vacaciones:', error);
      toast({
        title: "Error",
        description: "Error al importar las vacaciones",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const removeRow = (index: number) => {
    setPreviewData(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Vacaciones Históricas desde Excel</DialogTitle>
          <DialogDescription>
            Descarga la plantilla, complétala con las vacaciones gozadas o pendientes y súbela. 
            Estados válidos: <strong>gozadas</strong>, aprobada, pendiente, rechazada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={downloadTemplate} variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Descargar Plantilla
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Subir archivo Excel</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={importing}
            />
          </div>

          {previewData.length > 0 && (
            <div className="border rounded-lg p-4 space-y-2">
              <h3 className="font-semibold">Vista previa ({previewData.length} registros)</h3>
              <div className="max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Legajo</TableHead>
                      <TableHead>Fecha Inicio</TableHead>
                      <TableHead>Fecha Fin</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((vac, index) => (
                      <TableRow key={index}>
                        <TableCell>{vac.empleado_legajo}</TableCell>
                        <TableCell>{vac.fecha_inicio}</TableCell>
                        <TableCell>{vac.fecha_fin}</TableCell>
                        <TableCell>{vac.motivo || '-'}</TableCell>
                        <TableCell>{vac.estado || 'pendiente'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRow(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={previewData.length === 0 || importing}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar {previewData.length} Vacaciones
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
