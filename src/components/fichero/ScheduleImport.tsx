import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportedTurno {
  nombre: string;
  tipo: string;
  hora_entrada: string;
  hora_salida: string;
  hora_pausa_inicio?: string;
  hora_pausa_fin?: string;
  tolerancia_entrada_minutos: number;
  tolerancia_salida_minutos: number;
  redondeo_minutos: number;
  permite_extras: string;
  sucursal_nombre?: string;
}

interface ScheduleImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export default function ScheduleImport({ open, onOpenChange, onImportComplete }: ScheduleImportProps) {
  const [turnos, setTurnos] = useState<ImportedTurno[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const template = [
      {
        'Nombre': 'Turno Mañana',
        'Tipo': 'normal',
        'Hora Entrada': '08:00',
        'Hora Salida': '17:00',
        'Pausa Inicio (Opcional)': '12:00',
        'Pausa Fin (Opcional)': '13:00',
        'Tolerancia Entrada (min)': 10,
        'Tolerancia Salida (min)': 10,
        'Redondeo (min)': 5,
        'Permite Extras': 'SI',
        'Sucursal (Opcional)': 'Central'
      },
      {
        'Nombre': 'Turno Tarde',
        'Tipo': 'normal',
        'Hora Entrada': '14:00',
        'Hora Salida': '22:00',
        'Pausa Inicio (Opcional)': '',
        'Pausa Fin (Opcional)': '',
        'Tolerancia Entrada (min)': 15,
        'Tolerancia Salida (min)': 15,
        'Redondeo (min)': 5,
        'Permite Extras': 'SI',
        'Sucursal (Opcional)': ''
      },
      {
        'Nombre': 'Turno Nocturno',
        'Tipo': 'nocturno',
        'Hora Entrada': '22:00',
        'Hora Salida': '06:00',
        'Pausa Inicio (Opcional)': '02:00',
        'Pausa Fin (Opcional)': '02:30',
        'Tolerancia Entrada (min)': 10,
        'Tolerancia Salida (min)': 10,
        'Redondeo (min)': 5,
        'Permite Extras': 'NO',
        'Sucursal (Opcional)': 'Central'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Horarios");
    
    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 20 },  // Nombre
      { wch: 12 },  // Tipo
      { wch: 15 },  // Hora Entrada
      { wch: 15 },  // Hora Salida
      { wch: 20 },  // Pausa Inicio
      { wch: 20 },  // Pausa Fin
      { wch: 20 },  // Tolerancia Entrada
      { wch: 20 },  // Tolerancia Salida
      { wch: 15 },  // Redondeo
      { wch: 15 },  // Permite Extras
      { wch: 20 }   // Sucursal
    ];

    XLSX.writeFile(wb, "plantilla_importacion_horarios.xlsx");
    
    toast({
      title: "Plantilla descargada",
      description: "Completa la plantilla con los horarios que deseas crear. Tipos válidos: normal, nocturno, partido, flexible",
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

        const importedTurnos: ImportedTurno[] = data.map((row: any) => ({
          nombre: row['Nombre']?.toString().trim() || '',
          tipo: row['Tipo']?.toString().toLowerCase().trim() || 'normal',
          hora_entrada: row['Hora Entrada']?.toString().trim() || '',
          hora_salida: row['Hora Salida']?.toString().trim() || '',
          hora_pausa_inicio: row['Pausa Inicio (Opcional)']?.toString().trim() || undefined,
          hora_pausa_fin: row['Pausa Fin (Opcional)']?.toString().trim() || undefined,
          tolerancia_entrada_minutos: parseInt(row['Tolerancia Entrada (min)']) || 10,
          tolerancia_salida_minutos: parseInt(row['Tolerancia Salida (min)']) || 10,
          redondeo_minutos: parseInt(row['Redondeo (min)']) || 5,
          permite_extras: row['Permite Extras']?.toString().toUpperCase().trim() || 'SI',
          sucursal_nombre: row['Sucursal (Opcional)']?.toString().trim() || undefined
        }));

        setTurnos(importedTurnos);
        toast({
          title: "Archivo cargado",
          description: `${importedTurnos.length} horario(s) encontrado(s)`,
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

  const updateTurno = (index: number, field: keyof ImportedTurno, value: string | number) => {
    const updated = [...turnos];
    updated[index] = { ...updated[index], [field]: value };
    setTurnos(updated);
  };

  const removeTurno = (index: number) => {
    setTurnos(turnos.filter((_, i) => i !== index));
  };

  const validateTurnos = (): boolean => {
    for (const turno of turnos) {
      if (!turno.nombre || !turno.hora_entrada || !turno.hora_salida) {
        toast({
          title: "Error de validación",
          description: "Todos los horarios deben tener nombre, hora de entrada y hora de salida",
          variant: "destructive",
        });
        return false;
      }

      // Validar tipo
      const tiposValidos = ['normal', 'nocturno', 'partido', 'flexible'];
      if (!tiposValidos.includes(turno.tipo)) {
        toast({
          title: "Error de validación",
          description: `Tipo inválido para ${turno.nombre}. Use: normal, nocturno, partido o flexible`,
          variant: "destructive",
        });
        return false;
      }

      // Validar formato de hora
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(turno.hora_entrada) || !timeRegex.test(turno.hora_salida)) {
        toast({
          title: "Error de validación",
          description: `Formato de hora inválido para ${turno.nombre}. Use formato HH:MM (24h)`,
          variant: "destructive",
        });
        return false;
      }

      if (turno.hora_pausa_inicio && !timeRegex.test(turno.hora_pausa_inicio)) {
        toast({
          title: "Error de validación",
          description: `Formato de pausa inicio inválido para ${turno.nombre}. Use formato HH:MM (24h)`,
          variant: "destructive",
        });
        return false;
      }

      if (turno.hora_pausa_fin && !timeRegex.test(turno.hora_pausa_fin)) {
        toast({
          title: "Error de validación",
          description: `Formato de pausa fin inválido para ${turno.nombre}. Use formato HH:MM (24h)`,
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const handleImport = async () => {
    if (!validateTurnos()) return;

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const turno of turnos) {
      try {
        let sucursal_id = null;

        // Buscar sucursal si se especificó
        if (turno.sucursal_nombre) {
          const { data: sucursal, error: sucursalError } = await supabase
            .from('sucursales')
            .select('id')
            .eq('nombre', turno.sucursal_nombre)
            .eq('activa', true)
            .maybeSingle();

          if (sucursalError) {
            console.error(`Error buscando sucursal ${turno.sucursal_nombre}:`, sucursalError);
          } else if (sucursal) {
            sucursal_id = sucursal.id;
          }
        }

        // Crear el horario
        const { error: insertError } = await supabase
          .from('fichado_turnos')
          .insert([{
            nombre: turno.nombre,
            tipo: turno.tipo as 'normal' | 'nocturno' | 'partido' | 'flexible',
            hora_entrada: turno.hora_entrada,
            hora_salida: turno.hora_salida,
            hora_pausa_inicio: turno.hora_pausa_inicio || null,
            hora_pausa_fin: turno.hora_pausa_fin || null,
            tolerancia_entrada_minutos: turno.tolerancia_entrada_minutos,
            tolerancia_salida_minutos: turno.tolerancia_salida_minutos,
            redondeo_minutos: turno.redondeo_minutos,
            permite_extras: turno.permite_extras === 'SI',
            sucursal_id: sucursal_id,
            activo: true
          }]);

        if (insertError) {
          console.error(`Error creando horario ${turno.nombre}:`, insertError);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`Error procesando ${turno.nombre}:`, error);
        errorCount++;
      }
    }

    setLoading(false);

    if (successCount > 0) {
      toast({
        title: "Importación completada",
        description: `${successCount} horario(s) creado(s) exitosamente${errorCount > 0 ? `, ${errorCount} error(es)` : ''}`,
      });
      setTurnos([]);
      onImportComplete();
      onOpenChange(false);
    } else {
      toast({
        title: "Error en la importación",
        description: "No se pudieron crear los horarios",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Horarios desde Excel</DialogTitle>
          <DialogDescription>
            Descarga la plantilla, complétala con los horarios a crear (incluyendo pausas y tolerancias) y súbela para importar
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

          {turnos.length > 0 && (
            <>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Salida</TableHead>
                      <TableHead>Pausa Inicio</TableHead>
                      <TableHead>Pausa Fin</TableHead>
                      <TableHead>Tol. Ent.</TableHead>
                      <TableHead>Tol. Sal.</TableHead>
                      <TableHead>Redondeo</TableHead>
                      <TableHead>Extras</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {turnos.map((turno, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={turno.nombre}
                            onChange={(e) => updateTurno(index, 'nombre', e.target.value)}
                            className="w-full min-w-[150px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={turno.tipo}
                            onChange={(e) => updateTurno(index, 'tipo', e.target.value)}
                            className="w-full min-w-[100px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            value={turno.hora_entrada}
                            onChange={(e) => updateTurno(index, 'hora_entrada', e.target.value)}
                            className="w-full min-w-[100px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            value={turno.hora_salida}
                            onChange={(e) => updateTurno(index, 'hora_salida', e.target.value)}
                            className="w-full min-w-[100px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            value={turno.hora_pausa_inicio || ''}
                            onChange={(e) => updateTurno(index, 'hora_pausa_inicio', e.target.value)}
                            className="w-full min-w-[100px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            value={turno.hora_pausa_fin || ''}
                            onChange={(e) => updateTurno(index, 'hora_pausa_fin', e.target.value)}
                            className="w-full min-w-[100px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={turno.tolerancia_entrada_minutos}
                            onChange={(e) => updateTurno(index, 'tolerancia_entrada_minutos', parseInt(e.target.value))}
                            className="w-full min-w-[80px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={turno.tolerancia_salida_minutos}
                            onChange={(e) => updateTurno(index, 'tolerancia_salida_minutos', parseInt(e.target.value))}
                            className="w-full min-w-[80px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={turno.redondeo_minutos}
                            onChange={(e) => updateTurno(index, 'redondeo_minutos', parseInt(e.target.value))}
                            className="w-full min-w-[80px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={turno.permite_extras}
                            onChange={(e) => updateTurno(index, 'permite_extras', e.target.value)}
                            className="w-full min-w-[60px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={turno.sucursal_nombre || ''}
                            onChange={(e) => updateTurno(index, 'sucursal_nombre', e.target.value)}
                            className="w-full min-w-[120px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTurno(index)}
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
                  disabled={loading || turnos.length === 0}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {loading ? 'Creando...' : `Crear ${turnos.length} Horario(s)`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
