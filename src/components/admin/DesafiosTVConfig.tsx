import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, Users, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  avatar_url: string | null;
  participa: boolean;
  motivo_exclusion: string | null;
}

export function DesafiosTVConfig() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadEmpleados();
  }, []);

  const loadEmpleados = async () => {
    try {
      setLoading(true);

      // Obtener todos los empleados activos
      const { data: empleadosData, error: empleadosError } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, email, rol, avatar_url')
        .eq('activo', true)
        .order('apellido', { ascending: true });

      if (empleadosError) throw empleadosError;

      // Obtener configuración de participación
      const { data: participantesData, error: participantesError } = await supabase
        .from('desafios_tv_participantes')
        .select('empleado_id, participa, motivo_exclusion');

      if (participantesError) throw participantesError;

      // Combinar datos
      const participantesMap = new Map(
        participantesData?.map(p => [p.empleado_id, p]) || []
      );

      const empleadosConParticipacion = empleadosData?.map(emp => ({
        ...emp,
        participa: participantesMap.get(emp.id)?.participa ?? true,
        motivo_exclusion: participantesMap.get(emp.id)?.motivo_exclusion ?? null,
      })) || [];

      setEmpleados(empleadosConParticipacion);
    } catch (error) {
      console.error('Error cargando empleados:', error);
      toast.error('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleParticipacion = async (empleadoId: string, participa: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Obtener el empleado_id del usuario actual
      const { data: empleadoActual } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      
      const { error } = await supabase
        .from('desafios_tv_participantes')
        .upsert({
          empleado_id: empleadoId,
          participa,
          configurado_por: empleadoActual?.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'empleado_id'
        });

      if (error) throw error;

      setEmpleados(prev =>
        prev.map(emp =>
          emp.id === empleadoId ? { ...emp, participa } : emp
        )
      );

      toast.success(participa ? 'Empleado incluido en rankings' : 'Empleado excluido de rankings');
    } catch (error) {
      console.error('Error actualizando participación:', error);
      toast.error('Error al actualizar participación');
    }
  };

  const handleSaveMotivo = async (empleadoId: string, motivo: string) => {
    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      
      // Obtener el empleado_id del usuario actual
      const { data: empleadoActual } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      
      const { error } = await supabase
        .from('desafios_tv_participantes')
        .upsert({
          empleado_id: empleadoId,
          motivo_exclusion: motivo,
          configurado_por: empleadoActual?.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'empleado_id'
        });

      if (error) throw error;

      setEmpleados(prev =>
        prev.map(emp =>
          emp.id === empleadoId ? { ...emp, motivo_exclusion: motivo } : emp
        )
      );

      toast.success('Motivo guardado');
    } catch (error) {
      console.error('Error guardando motivo:', error);
      toast.error('Error al guardar motivo');
    } finally {
      setSaving(false);
    }
  };

  const filteredEmpleados = empleados.filter(emp =>
    `${emp.nombre} ${emp.apellido} ${emp.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const participantesCount = empleados.filter(e => e.participa).length;
  const excluidosCount = empleados.filter(e => !e.participa).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-6 h-6" />
            Configuración de Desafíos TV
          </CardTitle>
          <CardDescription>
            Selecciona qué empleados aparecerán en los rankings públicos de Desafíos TV
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Total Empleados</div>
              <div className="text-3xl font-bold text-foreground">{empleados.length}</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4">
              <div className="text-sm text-green-600 dark:text-green-400">Participan</div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{participantesCount}</div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-4">
              <div className="text-sm text-red-600 dark:text-red-400">Excluidos</div>
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">{excluidosCount}</div>
            </div>
          </div>

          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empleados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabla de empleados */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-center">Participa</TableHead>
                  <TableHead>Motivo de Exclusión</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmpleados.map((empleado) => (
                  <TableRow key={empleado.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={empleado.avatar_url || ''} />
                          <AvatarFallback>
                            {empleado.nombre[0]}{empleado.apellido[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {empleado.nombre} {empleado.apellido}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {empleado.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {empleado.rol}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={empleado.participa}
                        onCheckedChange={(checked) =>
                          handleToggleParticipacion(empleado.id, checked)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {!empleado.participa && (
                        <Input
                          placeholder="Ej: Dirección, Mandos medios..."
                          defaultValue={empleado.motivo_exclusion || ''}
                          onBlur={(e) => {
                            if (e.target.value !== empleado.motivo_exclusion) {
                              handleSaveMotivo(empleado.id, e.target.value);
                            }
                          }}
                          className="max-w-xs"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {empleado.participa ? (
                        <Badge variant="default" className="bg-green-600">
                          Visible en TV
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Oculto
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredEmpleados.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron empleados
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
