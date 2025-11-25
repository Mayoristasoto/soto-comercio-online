import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormularioEvaluacion } from "@/components/evaluaciones/FormularioEvaluacion";
import { ArrowLeft, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PreviewEvaluacion() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);

  // Datos de ejemplo para la vista previa
  const empleadoEjemplo = {
    nombre: "Juan Carlos",
    apellido: "González",
    puesto: "Vendedor Senior",
    id: "preview-empleado-123",
  };

  const evaluacionEjemplo = {
    id: "preview-evaluacion-456",
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Eye className="h-8 w-8" />
            Vista Previa - Evaluación de Desempeño
          </h1>
          <p className="text-muted-foreground mt-2">
            Ejemplo de cómo un gerente de sucursal visualiza el formulario de evaluación
          </p>
        </div>
      </div>

      {!showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Empleado de Ejemplo</CardTitle>
            <CardDescription>
              Esta es una vista previa del formulario de evaluación con datos de demostración
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nombre:</span>
                <span className="font-medium">{empleadoEjemplo.nombre} {empleadoEjemplo.apellido}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Puesto:</span>
                <span className="font-medium">{empleadoEjemplo.puesto}</span>
              </div>
            </div>

            <Button onClick={() => setShowForm(true)} className="w-full">
              Ver Formulario de Evaluación
            </Button>

            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
              <p className="font-semibold mb-2">💡 Nota:</p>
              <p>Esta es una vista previa con datos de ejemplo. Los cambios realizados aquí no se guardarán en la base de datos.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <FormularioEvaluacion
          empleado={{
            id: empleadoEjemplo.id,
            nombre: empleadoEjemplo.nombre,
            apellido: empleadoEjemplo.apellido,
            puesto: empleadoEjemplo.puesto,
          }}
          evaluacionId={evaluacionEjemplo.id}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
