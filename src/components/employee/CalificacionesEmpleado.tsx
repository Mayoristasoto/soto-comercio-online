import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface Calificacion {
  id: string;
  calificacion: number;
  comentario: string | null;
  fecha_calificacion: string;
  venta_id: string | null;
}

export default function CalificacionesEmpleado({ empleadoId }: { empleadoId: string }) {
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    promedio: 0,
    total: 0,
    distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });

  useEffect(() => {
    loadCalificaciones();
  }, [empleadoId]);

  const loadCalificaciones = async () => {
    try {
      const { data, error } = await supabase
        .from("calificaciones_empleados")
        .select("*")
        .eq("empleado_id", empleadoId)
        .order("fecha_calificacion", { ascending: false });

      if (error) {
        console.error("Error loading ratings:", error);
        toast.error("Error al cargar calificaciones");
        return;
      }

      setCalificaciones(data || []);

      // Calcular estadísticas
      if (data && data.length > 0) {
        const total = data.length;
        const suma = data.reduce((acc, cal) => acc + cal.calificacion, 0);
        const promedio = suma / total;

        const distribucion = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        data.forEach((cal) => {
          distribucion[cal.calificacion as keyof typeof distribucion]++;
        });

        setStats({ promedio, total, distribucion });
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse text-muted-foreground">
            Cargando calificaciones...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen de calificaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Calificaciones de Clientes</CardTitle>
          <CardDescription>
            Calificaciones recibidas a través de facturas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.total === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay calificaciones aún
            </div>
          ) : (
            <div className="space-y-6">
              {/* Promedio general */}
              <div className="text-center">
                <div className="text-5xl font-bold text-primary mb-2">
                  {stats.promedio.toFixed(1)}
                </div>
                <div className="flex justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${
                        star <= Math.round(stats.promedio)
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  Basado en {stats.total} calificación{stats.total !== 1 ? "es" : ""}
                </div>
              </div>

              {/* Distribución */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = stats.distribucion[rating as keyof typeof stats.distribucion];
                  const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;

                  return (
                    <div key={rating} className="flex items-center gap-2">
                      <div className="flex items-center gap-1 w-16">
                        <span className="text-sm">{rating}</span>
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      </div>
                      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-sm text-muted-foreground w-12 text-right">
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de calificaciones recientes */}
      {calificaciones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Comentarios Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {calificaciones.slice(0, 10).map((cal) => (
                <div
                  key={cal.id}
                  className="border-b border-border last:border-0 pb-4 last:pb-0"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= cal.calificacion
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(cal.fecha_calificacion).toLocaleDateString("es-AR", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  {cal.comentario && (
                    <p className="text-sm text-muted-foreground">{cal.comentario}</p>
                  )}
                  {cal.venta_id && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Venta: {cal.venta_id}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
