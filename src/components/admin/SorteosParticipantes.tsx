import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift, Search, Download, Star, User, Phone, Hash } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function SorteosParticipantes() {
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    conDatos: 0,
    promedio: 0,
  });

  useEffect(() => {
    loadParticipantes();
  }, []);

  const loadParticipantes = async () => {
    try {
      const { data, error } = await supabase
        .from("calificaciones_empleados")
        .select(`
          *,
          empleados:empleado_id (
            nombre,
            apellido,
            avatar_url,
            puesto
          )
        `)
        .eq("participa_sorteo", true)
        .not("sorteo_numero", "is", null)
        .order("fecha_calificacion", { ascending: false });

      if (error) throw error;

      setParticipantes(data || []);

      // Calcular estadísticas
      const total = data?.length || 0;
      const conDatos = data?.filter(p => p.cliente_nombre_completo && p.cliente_dni).length || 0;
      const sumCalificaciones = data?.reduce((sum, p) => sum + p.calificacion, 0) || 0;
      const promedio = total > 0 ? sumCalificaciones / total : 0;

      setStats({ total, conDatos, promedio });
    } catch (error) {
      console.error("Error loading participants:", error);
      toast.error("Error al cargar participantes");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Número Sorteo",
      "Fecha",
      "Cliente",
      "DNI",
      "Teléfono",
      "Empleado",
      "Calificación Empleado",
      "Calificación Servicio",
      "Comentario"
    ];

    const rows = filteredParticipantes.map(p => [
      p.sorteo_numero,
      new Date(p.fecha_calificacion).toLocaleString('es-AR'),
      p.cliente_nombre_completo || 'N/A',
      p.cliente_dni || 'N/A',
      p.cliente_telefono || 'N/A',
      `${p.empleados?.nombre} ${p.empleados?.apellido}`,
      p.calificacion,
      p.calificacion_servicio || 'N/A',
      p.comentario || 'Sin comentario'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sorteo_participantes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success("Archivo CSV exportado");
  };

  const filteredParticipantes = participantes.filter(p => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      p.cliente_nombre_completo?.toLowerCase().includes(searchLower) ||
      p.cliente_dni?.includes(search) ||
      p.sorteo_numero?.toString().includes(search) ||
      `${p.empleados?.nombre} ${p.empleados?.apellido}`.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">Cargando participantes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Gift className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Participantes del Sorteo</h2>
            <p className="text-sm text-muted-foreground">
              Clientes que participan en el sorteo mensual
            </p>
          </div>
        </div>
        <Button onClick={exportToCSV} disabled={filteredParticipantes.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Participantes</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Con Datos Completos</CardDescription>
            <CardTitle className="text-3xl">
              {stats.conDatos}
              <span className="text-sm text-muted-foreground ml-2">
                ({stats.total > 0 ? Math.round((stats.conDatos / stats.total) * 100) : 0}%)
              </span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Calificación Promedio</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {stats.promedio.toFixed(1)}
              <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Búsqueda y tabla */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, DNI, número de sorteo o empleado..."
                className="pl-9"
              />
            </div>
            <Badge variant="secondary">
              {filteredParticipantes.length} resultado{filteredParticipantes.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Sorteo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Calificaciones</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipantes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No hay participantes aún
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParticipantes.map((participante) => (
                    <TableRow key={participante.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-mono font-bold text-primary">
                          <Hash className="w-4 h-4" />
                          {participante.sorteo_numero.toString().padStart(6, '0')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {participante.cliente_nombre_completo || 'Sin nombre'}
                            </span>
                          </div>
                          {participante.cliente_dni && (
                            <div className="text-xs text-muted-foreground">
                              DNI: {participante.cliente_dni}
                            </div>
                          )}
                          {participante.cliente_telefono && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {participante.cliente_telefono}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={participante.empleados?.avatar_url} />
                            <AvatarFallback>
                              {participante.empleados?.nombre?.[0]}
                              {participante.empleados?.apellido?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">
                              {participante.empleados?.nombre} {participante.empleados?.apellido}
                            </div>
                            {participante.empleados?.puesto && (
                              <div className="text-xs text-muted-foreground">
                                {participante.empleados.puesto}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">{participante.calificacion}/5</span>
                            <span className="text-xs text-muted-foreground">empleado</span>
                          </div>
                          {participante.calificacion_servicio && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-blue-500 fill-blue-500" />
                              <span className="font-medium">{participante.calificacion_servicio}/5</span>
                              <span className="text-xs text-muted-foreground">servicio</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(participante.fecha_calificacion).toLocaleDateString('es-AR')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(participante.fecha_calificacion).toLocaleTimeString('es-AR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
