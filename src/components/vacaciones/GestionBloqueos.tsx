import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Bloqueo {
  id: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  activo: boolean;
  created_at: string;
}

export function GestionBloqueos() {
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNuevo, setShowNuevo] = useState(false);
  const [fechaInicio, setFechaInicio] = useState<Date>();
  const [fechaFin, setFechaFin] = useState<Date>();
  const [motivo, setMotivo] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchBloqueos();
  }, []);

  const fetchBloqueos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vacaciones_bloqueos')
        .select('*')
        .order('fecha_inicio', { ascending: false });

      if (error) throw error;
      setBloqueos(data || []);
    } catch (error: any) {
      console.error('Error fetching bloqueos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los bloqueos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCrear = async () => {
    if (!fechaInicio || !fechaFin || !motivo) {
      toast({
        title: "Datos incompletos",
        description: "Completa todos los campos",
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

      const { error } = await supabase.from('vacaciones_bloqueos').insert({
        fecha_inicio: fechaInicio.toISOString().split('T')[0],
        fecha_fin: fechaFin.toISOString().split('T')[0],
        motivo,
        creado_por: empleado.id,
        activo: true,
      });

      if (error) throw error;

      toast({
        title: "Bloqueo creado",
        description: "El periodo ha sido bloqueado exitosamente",
      });

      setFechaInicio(undefined);
      setFechaFin(undefined);
      setMotivo("");
      setShowNuevo(false);
      fetchBloqueos();
    } catch (error: any) {
      console.error('Error creating bloqueo:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el bloqueo",
        variant: "destructive",
      });
    }
  };

  const handleEliminar = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vacaciones_bloqueos')
        .update({ activo: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Bloqueo eliminado",
        description: "El bloqueo ha sido desactivado",
      });

      fetchBloqueos();
    } catch (error: any) {
      console.error('Error deleting bloqueo:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el bloqueo",
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestión de Bloqueos</CardTitle>
              <CardDescription>
                Bloquea periodos donde no se pueden solicitar vacaciones
              </CardDescription>
            </div>
            <Button onClick={() => setShowNuevo(!showNuevo)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Bloqueo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showNuevo && (
            <div className="p-4 border rounded-lg space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Fecha de Inicio</Label>
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
                        {fechaInicio ? (
                          format(fechaInicio, "PPP", { locale: es })
                        ) : (
                          <span>Selecciona una fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fechaInicio}
                        onSelect={setFechaInicio}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Fecha de Fin</Label>
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
                        {fechaFin ? (
                          format(fechaFin, "PPP", { locale: es })
                        ) : (
                          <span>Selecciona una fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fechaFin}
                        onSelect={setFechaFin}
                        disabled={(date) => date < (fechaInicio || new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo del Bloqueo</Label>
                <Textarea
                  id="motivo"
                  placeholder="Ej: Periodo de alta demanda"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={2}
                />
              </div>

              <Button onClick={handleCrear} className="w-full">
                Crear Bloqueo
              </Button>
            </div>
          )}

          <div className="space-y-4">
            {bloqueos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay bloqueos registrados
              </p>
            ) : (
              bloqueos.map((bloqueo) => (
                <div
                  key={bloqueo.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{bloqueo.motivo}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(bloqueo.fecha_inicio), "d 'de' MMMM", { locale: es })} -{" "}
                      {format(new Date(bloqueo.fecha_fin), "d 'de' MMMM", { locale: es })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={bloqueo.activo ? "default" : "secondary"}>
                      {bloqueo.activo ? "Activo" : "Inactivo"}
                    </Badge>
                    {bloqueo.activo && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEliminar(bloqueo.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
