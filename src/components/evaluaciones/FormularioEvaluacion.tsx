import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { ArrowLeft, Save, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Concepto {
  id: string;
  nombre: string;
  descripcion: string;
  orden: number;
}

interface Detalle {
  concepto_id: string;
  puntuacion: number;
  comentario: string;
}

interface FormularioEvaluacionProps {
  empleado: {
    id: string;
    nombre: string;
    apellido: string;
    puesto?: string;
  };
  evaluacionId: string;
  onClose: () => void;
}

export function FormularioEvaluacion({ empleado, evaluacionId, onClose }: FormularioEvaluacionProps) {
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [detalles, setDetalles] = useState<Map<string, Detalle>>(new Map());
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estadoEvaluacion, setEstadoEvaluacion] = useState<string>("pendiente");

  useEffect(() => {
    fetchConceptos();
    fetchEvaluacionExistente();
  }, []);

  const fetchConceptos = async () => {
    try {
      const { data, error } = await supabase
        .from("evaluaciones_conceptos")
        .select("*")
        .eq("activo", true)
        .order("orden");

      if (error) throw error;
      setConceptos(data || []);
    } catch (error) {
      console.error("Error fetching concepts:", error);
      toast.error("Error al cargar conceptos");
    } finally {
      setLoading(false);
    }
  };

  const fetchEvaluacionExistente = async () => {
    try {
      // Cargar evaluación
      const { data: evaluacion, error: evalError } = await supabase
        .from("evaluaciones_mensuales")
        .select("observaciones, estado")
        .eq("id", evaluacionId)
        .single();

      if (evalError) throw evalError;
      
      setObservaciones(evaluacion?.observaciones || "");
      setEstadoEvaluacion(evaluacion?.estado || "pendiente");

      // Cargar detalles existentes
      const { data: detallesData, error: detError } = await supabase
        .from("evaluaciones_detalles")
        .select("*")
        .eq("evaluacion_id", evaluacionId);

      if (detError) throw detError;

      const detallesMap = new Map<string, Detalle>();
      detallesData?.forEach((det) => {
        detallesMap.set(det.concepto_id, {
          concepto_id: det.concepto_id,
          puntuacion: det.puntuacion,
          comentario: det.comentario || "",
        });
      });
      setDetalles(detallesMap);
    } catch (error) {
      console.error("Error fetching evaluation:", error);
    }
  };

  const handlePuntuacionChange = (conceptoId: string, puntuacion: number) => {
    const newDetalles = new Map(detalles);
    const detalle = newDetalles.get(conceptoId) || {
      concepto_id: conceptoId,
      puntuacion: 5,
      comentario: "",
    };
    detalle.puntuacion = puntuacion;
    newDetalles.set(conceptoId, detalle);
    setDetalles(newDetalles);
  };

  const handleComentarioChange = (conceptoId: string, comentario: string) => {
    const newDetalles = new Map(detalles);
    const detalle = newDetalles.get(conceptoId) || {
      concepto_id: conceptoId,
      puntuacion: 5,
      comentario: "",
    };
    detalle.comentario = comentario;
    newDetalles.set(conceptoId, detalle);
    setDetalles(newDetalles);
  };

  const handleGuardar = async (finalizar: boolean = false) => {
    setSaving(true);
    try {
      // Guardar cada detalle
      for (const [conceptoId, detalle] of detalles) {
        const { error } = await supabase
          .from("evaluaciones_detalles")
          .upsert({
            evaluacion_id: evaluacionId,
            concepto_id: conceptoId,
            puntuacion: detalle.puntuacion,
            comentario: detalle.comentario,
          });

        if (error) throw error;
      }

      // Actualizar observaciones y estado si se finaliza
      const updateData: any = { observaciones };
      if (finalizar) {
        updateData.estado = "completada";
        updateData.fecha_completada = new Date().toISOString();
      }

      const { error: evalError } = await supabase
        .from("evaluaciones_mensuales")
        .update(updateData)
        .eq("id", evaluacionId);

      if (evalError) throw evalError;

      toast.success(finalizar ? "Evaluación completada" : "Progreso guardado");
      if (finalizar) {
        onClose();
      } else {
        setEstadoEvaluacion("pendiente");
      }
    } catch (error) {
      console.error("Error saving evaluation:", error);
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const isCompleta = detalles.size === conceptos.length;
  const soloLectura = estadoEvaluacion === "completada";

  const calcularPromedio = () => {
    if (detalles.size === 0) return 0;
    const sum = Array.from(detalles.values()).reduce((acc, det) => acc + det.puntuacion, 0);
    return (sum / detalles.size).toFixed(1);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Evaluación: {empleado.nombre} {empleado.apellido}
                {soloLectura && (
                  <Badge variant="secondary">Completada</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {empleado.puesto || "Sin puesto"} • Promedio actual: {calcularPromedio()}/10
              </CardDescription>
            </div>
            <Button variant="outline" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {conceptos.map((concepto) => {
          const detalle = detalles.get(concepto.id);
          const puntuacion = detalle?.puntuacion || 5;

          return (
            <Card key={concepto.id}>
              <CardHeader>
                <CardTitle className="text-lg">{concepto.nombre}</CardTitle>
                <CardDescription>{concepto.descripcion}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Puntuación</Label>
                    <Badge variant="outline" className="text-lg font-bold">
                      {puntuacion}/10
                    </Badge>
                  </div>
                  <Slider
                    value={[puntuacion]}
                    onValueChange={(values) => handlePuntuacionChange(concepto.id, values[0])}
                    min={1}
                    max={10}
                    step={1}
                    disabled={soloLectura}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 - Insuficiente</span>
                    <span>5 - Satisfactorio</span>
                    <span>10 - Excelente</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`comentario-${concepto.id}`}>
                    Comentarios (opcional)
                  </Label>
                  <Textarea
                    id={`comentario-${concepto.id}`}
                    placeholder="Agrega comentarios sobre este aspecto..."
                    value={detalle?.comentario || ""}
                    onChange={(e) => handleComentarioChange(concepto.id, e.target.value)}
                    disabled={soloLectura}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Observaciones generales */}
        <Card>
          <CardHeader>
            <CardTitle>Observaciones Generales</CardTitle>
            <CardDescription>
              Comentarios adicionales sobre el desempeño del empleado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Escribe observaciones generales sobre el desempeño..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              disabled={soloLectura}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Botones de acción */}
        {!soloLectura && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => handleGuardar(false)}
                  disabled={saving || detalles.size === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Progreso
                </Button>
                <Button
                  onClick={() => handleGuardar(true)}
                  disabled={saving || !isCompleta}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Finalizar Evaluación
                </Button>
              </div>
              {!isCompleta && detalles.size > 0 && (
                <p className="text-sm text-muted-foreground text-right mt-2">
                  Completa todos los conceptos para finalizar
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
