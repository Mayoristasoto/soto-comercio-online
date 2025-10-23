import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Gift, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Label } from "@/components/ui/label";

interface Config {
  sorteo_activo: boolean;
  sorteo_titulo: string;
  sorteo_descripcion: string;
  mensaje_agradecimiento: string;
  requiere_datos_cliente: boolean;
  campos_opcionales: string[];
  calificar_servicio: boolean;
}

const createValidationSchema = (config: Config) => {
  const baseSchema = {
    calificacion: z.number().min(1).max(5),
    calificacionServicio: config.calificar_servicio 
      ? z.number().min(1).max(5) 
      : z.number().optional(),
    comentario: z.string().max(500).optional(),
  };

  if (config.requiere_datos_cliente) {
    const optionales = config.campos_opcionales;
    return z.object({
      ...baseSchema,
      nombreCompleto: optionales.includes('nombre') 
        ? z.string().max(200).optional()
        : z.string().trim().min(1, "Nombre requerido").max(200),
      dni: optionales.includes('dni')
        ? z.string().max(20).optional()
        : z.string().trim().min(7, "DNI requerido").max(20),
      telefono: optionales.includes('telefono')
        ? z.string().max(20).optional()
        : z.string().trim().min(8, "Teléfono requerido").max(20),
    });
  }

  return z.object(baseSchema);
};

export default function CalificarEmpleadoV2() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [empleado, setEmpleado] = useState<any>(null);
  const [config, setConfig] = useState<Config | null>(null);
  
  // Form state
  const [calificacion, setCalificacion] = useState(0);
  const [calificacionServicio, setCalificacionServicio] = useState(0);
  const [comentario, setComentario] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [hoverServiceRating, setHoverServiceRating] = useState(0);
  const [sorteoNumero, setSorteoNumero] = useState<number | null>(null);

  useEffect(() => {
    loadConfig();
    loadEmpleadoFromToken();
  }, [token]);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("calificaciones_config")
        .select("clave, valor");

      if (error) throw error;

      // Valores por defecto
      const defaults = {
        sorteo_activo: true,
        sorteo_titulo: "¡Participa en nuestro sorteo!",
        sorteo_descripcion: "Al calificar, participas automáticamente en nuestro sorteo mensual.",
        mensaje_agradecimiento: "¡Gracias por tu calificación!",
        requiere_datos_cliente: true,
        campos_opcionales: ['telefono'],
        calificar_servicio: true,
      };

      const configObj: any = { ...defaults };
      
      data?.forEach((item) => {
        if (item.clave === 'sorteo_activo' || item.clave === 'requiere_datos_cliente' || item.clave === 'calificar_servicio') {
          configObj[item.clave] = item.valor === 'true';
        } else if (item.clave === 'campos_opcionales') {
          configObj[item.clave] = item.valor.split(',').map((s: string) => s.trim());
        } else {
          configObj[item.clave] = item.valor;
        }
      });

      console.log("Config loaded:", configObj);
      setConfig(configObj as Config);
    } catch (error) {
      console.error("Error loading config:", error);
      // Set defaults if config fails
      setConfig({
        sorteo_activo: true,
        sorteo_titulo: "¡Participa en nuestro sorteo!",
        sorteo_descripcion: "Al calificar, participas automáticamente en nuestro sorteo mensual.",
        mensaje_agradecimiento: "¡Gracias por tu calificación!",
        requiere_datos_cliente: true,
        campos_opcionales: ['telefono'],
        calificar_servicio: true,
      });
    }
  };

  const loadEmpleadoFromToken = async () => {
    if (!token) {
      toast.error("Token inválido");
      setLoading(false);
      return;
    }

    try {
      const decoded = atob(token);
      const [empleadoId, ventaId] = decoded.split("-");

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

      const { data: empleadoData, error } = await (supabase.rpc as any)(
        "get_empleado_for_rating",
        { empleado_uuid: empleadoId }
      );

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
    if (!config) return;

    if (calificacion === 0) {
      toast.error("Por favor selecciona una calificación del empleado");
      return;
    }

    if (config.calificar_servicio && calificacionServicio === 0) {
      toast.error("Por favor califica también el servicio");
      return;
    }

    try {
      const validationSchema = createValidationSchema(config);
      const dataToValidate: any = {
        calificacion,
        calificacionServicio,
        comentario,
      };

      if (config.requiere_datos_cliente) {
        dataToValidate.nombreCompleto = nombreCompleto;
        dataToValidate.dni = dni;
        dataToValidate.telefono = telefono;
      }

      validationSchema.parse(dataToValidate);

      setSubmitting(true);

      // Generate sorteo number if active
      let numeroSorteo: number | null = null;
      if (config.sorteo_activo && config.requiere_datos_cliente && nombreCompleto && dni) {
        numeroSorteo = Math.floor(100000 + Math.random() * 900000); // 6-digit number
      }

      const { error } = await supabase
        .from("calificaciones_empleados")
        .insert({
          empleado_id: empleado.id,
          venta_id: empleado.ventaId,
          calificacion,
          calificacion_servicio: config.calificar_servicio ? calificacionServicio : null,
          comentario: comentario.trim() || null,
          cliente_nombre_completo: nombreCompleto.trim() || null,
          cliente_dni: dni.trim() || null,
          cliente_telefono: telefono.trim() || null,
          participa_sorteo: config.sorteo_activo && !!numeroSorteo,
          sorteo_numero: numeroSorteo,
          token_usado: token,
          ip_address: null,
        });

      if (error) {
        console.error("Error submitting rating:", error);
        toast.error("Error al enviar la calificación");
        return;
      }

      setSorteoNumero(numeroSorteo);
      toast.success(config.mensaje_agradecimiento);
      setSubmitted(true);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message || "Datos inválidos");
      } else {
        console.error("Error:", error);
        toast.error("Error al procesar la calificación");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const RatingStars = ({ value, onChange, hover, onHover, label }: any) => (
    <div className="space-y-2">
      <Label className="text-base font-medium">{label}</Label>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => onHover(star)}
            onMouseLeave={() => onHover(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-12 h-12 transition-colors ${
                star <= (hover || value)
                  ? "text-yellow-500 fill-yellow-500"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>
      {value > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          {value === 1 && "Muy insatisfecho"}
          {value === 2 && "Insatisfecho"}
          {value === 3 && "Normal"}
          {value === 4 && "Satisfecho"}
          {value === 5 && "Muy satisfecho"}
        </div>
      )}
    </div>
  );

  if (loading || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="animate-pulse text-muted-foreground">
          {!config ? "Cargando configuración..." : "Cargando..."}
        </div>
      </div>
    );
  }

  console.log("Rendering with config:", config);
  console.log("calificar_servicio:", config.calificar_servicio);
  console.log("requiere_datos_cliente:", config.requiere_datos_cliente);

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">{config.mensaje_agradecimiento}</CardTitle>
            <CardDescription>
              Tu opinión es muy valiosa para nosotros
            </CardDescription>
          </CardHeader>
          
          {config.sorteo_activo && sorteoNumero && (
            <CardContent className="space-y-4">
              <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/20 rounded-lg p-6 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="bg-yellow-500/20 p-3 rounded-full">
                    <Gift className="w-8 h-8 text-yellow-600" />
                  </div>
                </div>
                <h3 className="font-bold text-xl flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-600" />
                  {config.sorteo_titulo}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {config.sorteo_descripcion}
                </p>
                <div className="bg-white/50 rounded-lg p-4 mt-4">
                  <p className="text-xs text-muted-foreground mb-1">Tu número de sorteo:</p>
                  <p className="text-3xl font-bold text-primary tracking-wider">
                    #{sorteoNumero.toString().padStart(6, '0')}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Guarda este número para el sorteo
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  if (!empleado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
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

  const isOptional = (field: string) => config.campos_opcionales.includes(field);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 py-8">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Avatar className="w-24 h-24 ring-4 ring-primary/10">
              <AvatarImage src={empleado.avatar_url || ""} />
              <AvatarFallback className="text-2xl">
                {empleado.nombre?.[0]}{empleado.apellido?.[0]}
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-2xl">¿Cómo fue tu experiencia?</CardTitle>
          <CardDescription className="text-base">
            Fuiste atendido por: <strong className="text-foreground">{empleado.nombre} {empleado.apellido}</strong>
            {empleado.puesto && <div className="text-sm mt-1">{empleado.puesto}</div>}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Rating Empleado */}
          <RatingStars
            label="Califica al empleado"
            value={calificacion}
            onChange={setCalificacion}
            hover={hoverRating}
            onHover={setHoverRating}
          />

          {/* Rating Servicio */}
          {config.calificar_servicio && (
            <div className="pt-4 border-t">
              <RatingStars
                label="Califica el servicio general"
                value={calificacionServicio}
                onChange={setCalificacionServicio}
                hover={hoverServiceRating}
                onHover={setHoverServiceRating}
              />
            </div>
          )}

          {/* Datos del cliente */}
          {config.requiere_datos_cliente && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Gift className="w-4 h-4" />
                <span className="font-medium">Completa tus datos para participar en el sorteo</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nombre">
                  Nombre completo {!isOptional('nombre') && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="nombre"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value.slice(0, 200))}
                  placeholder="Tu nombre completo"
                  maxLength={200}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dni">
                    DNI {!isOptional('dni') && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="dni"
                    value={dni}
                    onChange={(e) => setDni(e.target.value.slice(0, 20))}
                    placeholder="12345678"
                    maxLength={20}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono">
                    Teléfono {!isOptional('telefono') && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="telefono"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value.slice(0, 20))}
                    placeholder="+54 9 11 1234-5678"
                    maxLength={20}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Comment */}
          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="comentario">Comentario (opcional)</Label>
            <Textarea
              id="comentario"
              value={comentario}
              onChange={(e) => setComentario(e.target.value.slice(0, 500))}
              placeholder="Comparte tu experiencia con nosotros..."
              className="resize-none min-h-[100px]"
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
            disabled={
              calificacion === 0 || 
              (config.calificar_servicio && calificacionServicio === 0) ||
              submitting
            }
            className="w-full h-12 text-base"
            size="lg"
          >
            {submitting ? "Enviando..." : "Enviar calificación"}
          </Button>

          {config.sorteo_activo && (
            <p className="text-xs text-center text-muted-foreground">
              Al enviar esta calificación, participas automáticamente en nuestro sorteo mensual
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
