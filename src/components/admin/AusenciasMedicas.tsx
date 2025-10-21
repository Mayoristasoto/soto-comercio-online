import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Upload, FileText, Download, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AusenciaMedica {
  id: string;
  empleado_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo_enfermedad: string | null;
  certificado_url: string | null;
  observaciones: string | null;
  registrado_por: string | null;
  created_at: string;
}

interface AusenciasMedicasProps {
  empleadoId: string;
  empleadoNombre?: string;
}

export const AusenciasMedicas = ({ empleadoId, empleadoNombre }: AusenciasMedicasProps) => {
  const [ausencias, setAusencias] = useState<AusenciaMedica[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [fechaInicio, setFechaInicio] = useState<Date>();
  const [fechaFin, setFechaFin] = useState<Date>();
  const [tipoEnfermedad, setTipoEnfermedad] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [certificadoFile, setCertificadoFile] = useState<File | null>(null);

  useEffect(() => {
    if (empleadoId) {
      loadAusencias();
    }
  }, [empleadoId]);

  const loadAusencias = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ausencias_medicas')
        .select('*')
        .eq('empleado_id', empleadoId)
        .order('fecha_inicio', { ascending: false });

      if (error) throw error;
      setAusencias(data || []);
    } catch (error: any) {
      console.error('Error loading ausencias:', error);
      toast.error('Error al cargar ausencias médicas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fechaInicio || !fechaFin) {
      toast.error('Debe seleccionar fecha de inicio y fin');
      return;
    }

    if (fechaFin < fechaInicio) {
      toast.error('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }

    try {
      setUploading(true);

      let certificadoUrl: string | null = null;

      // Upload certificate if provided
      if (certificadoFile) {
        const fileExt = certificadoFile.name.split('.').pop();
        const fileName = `${empleadoId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('certificados-medicos')
          .upload(fileName, certificadoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('certificados-medicos')
          .getPublicUrl(fileName);

        certificadoUrl = publicUrl;
      }

      // Get current user's empleado_id
      const { data: currentEmpleado } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      // Insert ausencia
      const { error: insertError } = await supabase
        .from('ausencias_medicas')
        .insert({
          empleado_id: empleadoId,
          fecha_inicio: format(fechaInicio, 'yyyy-MM-dd'),
          fecha_fin: format(fechaFin, 'yyyy-MM-dd'),
          tipo_enfermedad: tipoEnfermedad || null,
          certificado_url: certificadoUrl,
          observaciones: observaciones || null,
          registrado_por: currentEmpleado?.id
        });

      if (insertError) throw insertError;

      toast.success('Ausencia médica registrada correctamente');
      
      // Reset form
      setFechaInicio(undefined);
      setFechaFin(undefined);
      setTipoEnfermedad('');
      setObservaciones('');
      setCertificadoFile(null);
      setOpen(false);
      
      // Reload data
      loadAusencias();
    } catch (error: any) {
      console.error('Error registering ausencia:', error);
      toast.error('Error al registrar ausencia médica');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (ausenciaId: string) => {
    if (!confirm('¿Está seguro de eliminar esta ausencia médica?')) return;

    try {
      const { error } = await supabase
        .from('ausencias_medicas')
        .delete()
        .eq('id', ausenciaId);

      if (error) throw error;

      toast.success('Ausencia eliminada correctamente');
      loadAusencias();
    } catch (error: any) {
      console.error('Error deleting ausencia:', error);
      toast.error('Error al eliminar ausencia');
    }
  };

  const downloadCertificado = (url: string) => {
    window.open(url, '_blank');
  };

  const calcularDias = (inicio: string, fin: string) => {
    const start = new Date(inicio);
    const end = new Date(fin);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Ausencias Médicas</h3>
          {empleadoNombre && (
            <p className="text-sm text-muted-foreground">{empleadoNombre}</p>
          )}
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Ausencia
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Ausencia Médica</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha de Inicio *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !fechaInicio && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fechaInicio ? format(fechaInicio, "PPP", { locale: es }) : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={fechaInicio}
                        onSelect={setFechaInicio}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Fecha de Fin *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !fechaFin && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fechaFin ? format(fechaFin, "PPP", { locale: es }) : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={fechaFin}
                        onSelect={setFechaFin}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Enfermedad</Label>
                <Input
                  id="tipo"
                  value={tipoEnfermedad}
                  onChange={(e) => setTipoEnfermedad(e.target.value)}
                  placeholder="Ej: Gripe, Gastroenteritis, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="certificado">Certificado Médico</Label>
                <Input
                  id="certificado"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setCertificadoFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">
                  Formatos: PDF, JPG, PNG (máx. 5MB)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Notas adicionales..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Cargando...</p>
      ) : ausencias.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No hay ausencias médicas registradas
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ausencias.map((ausencia) => (
            <Card key={ausencia.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">
                      {format(new Date(ausencia.fecha_inicio), "dd/MM/yyyy")} - {format(new Date(ausencia.fecha_fin), "dd/MM/yyyy")}
                    </CardTitle>
                    <CardDescription>
                      {calcularDias(ausencia.fecha_inicio, ausencia.fecha_fin)} días de ausencia
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(ausencia.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {ausencia.tipo_enfermedad && (
                  <div>
                    <span className="text-sm font-medium">Tipo: </span>
                    <span className="text-sm text-muted-foreground">{ausencia.tipo_enfermedad}</span>
                  </div>
                )}
                {ausencia.observaciones && (
                  <div>
                    <span className="text-sm font-medium">Observaciones: </span>
                    <span className="text-sm text-muted-foreground">{ausencia.observaciones}</span>
                  </div>
                )}
                {ausencia.certificado_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadCertificado(ausencia.certificado_url!)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar Certificado
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
