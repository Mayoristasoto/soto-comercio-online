import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const calificacionSchema = z.object({
  calificacion: z.number().min(1).max(5),
  comentario: z.string().max(500).optional(),
});

export default function CalificarEmpleado() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [empleado, setEmpleado] = useState<any>(null);
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    loadEmpleadoFromToken();
  }, [token]);

  const loadEmpleadoFromToken = async () => {
    if (!token) {
      toast.error("Token inválido");
      setLoading(false);
      return;
    }

    try {
      // Decodificar token (formato: empleadoId_ventaId_timestamp)
      const decoded = atob(token);
      const [empleadoId, ventaId] = decoded.split("_");

      // Verificar si ya se usó este token
      const { data: existingRating } = await supabase
        .from("calificaciones_empleados")
        .select("id")
        .eq("token_usado", token)
        .maybeSingle();

      if (existingRating) {
        setSubmitted(true);
        setLoading(false);
        return;
      }

      // Cargar datos del empleado usando función RPC pública
      const { data: empleadoData, error } = await supabase
        .rpc("get_empleado_for_rating", { empleado_uuid: empleadoId }) as {
          data: Array<{
            id: string;
            nombre: string;
            apellido: string;
            avatar_url: string | null;
            puesto: string | null;
          }> | null;
          error: any;
        };

      if (error || !empleadoData || empleadoData.length === 0) {
        console.error("Error loading employee:", error);
        toast.error("No se pudo cargar la información del empleado");
        setLoading(false);
        return;
      }

      setEmpleado({ ...empleadoData[0], ventaId });
    } catch (error) {
      console.error("Error decoding token:", error);
      toast.error("Token inválido");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (calificacion === 0) {
      toast.error("Por favor selecciona una calificación");
      return;
    }

    try {
      // Validar datos
      calificacionSchema.parse({ calificacion, comentario });

      setSubmitting(true);

      const { error } = await supabase
        .from("calificaciones_empleados")
        .insert({
          empleado_id: empleado.id,
          venta_id: empleado.ventaId,
          calificacion,
          comentario: comentario.trim() || null,
          token_usado: token,
          ip_address: null, // Se puede capturar desde un edge function si es necesario
        });

      if (error) {
        console.error("Error submitting rating:", error);
        toast.error("Error al enviar la calificación");
        return;
      }

      toast.success("¡Gracias por tu calificación!");
      setSubmitted(true);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error("Datos inválidos");
      } else {
        console.error("Error:", error);
        toast.error("Error al procesar la calificación");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Star className="w-8 h-8 text-primary fill-primary" />
            </div>
            <CardTitle>¡Gracias por tu opinión!</CardTitle>
            <CardDescription>
              Tu calificación ya ha sido registrada
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!empleado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Enlace inválido</CardTitle>
            <CardDescription>
              No se pudo encontrar la información solicitada
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={empleado.avatar_url || ""} />
              <AvatarFallback>
                {empleado.nombre?.[0]}{empleado.apellido?.[0]}
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle>Califica tu experiencia</CardTitle>
          <CardDescription>
            Atendido por: <strong>{empleado.nombre} {empleado.apellido}</strong>
            {empleado.puesto && <div className="text-sm mt-1">{empleado.puesto}</div>}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Rating Stars */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setCalificacion(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= (hoverRating || calificacion)
                      ? "text-yellow-500 fill-yellow-500"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>

          {calificacion > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              {calificacion === 1 && "Muy insatisfecho"}
              {calificacion === 2 && "Insatisfecho"}
              {calificacion === 3 && "Normal"}
              {calificacion === 4 && "Satisfecho"}
              {calificacion === 5 && "Muy satisfecho"}
            </div>
          )}

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Comentario (opcional)
            </label>
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value.slice(0, 500))}
              placeholder="Comparte tu experiencia..."
              className="resize-none"
              rows={4}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {comentario.length}/500
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={calificacion === 0 || submitting}
            className="w-full"
          >
            {submitting ? "Enviando..." : "Enviar calificación"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
