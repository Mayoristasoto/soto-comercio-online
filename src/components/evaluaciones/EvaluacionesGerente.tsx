import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { User, Plus } from "lucide-react";
import { FormularioEvaluacion } from "./FormularioEvaluacion";

interface UserInfo {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
  sucursal_id?: string;
}

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  puesto: string;
  evaluacion_id?: string;
  estado_evaluacion?: string;
}

export function EvaluacionesGerente({ 
  userInfo, 
  onEvaluacionCompletada 
}: { 
  userInfo: UserInfo;
  onEvaluacionCompletada: () => void;
}) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchEmpleados();
  }, [userInfo]);

  const fetchEmpleados = async () => {
    try {
      const mesActual = new Date().getMonth() + 1;
      const anioActual = new Date().getFullYear();

      // Obtener empleados de la misma sucursal
      const { data: empleadosData, error: empError } = await supabase
        .from("empleados")
        .select("id, nombre, apellido, puesto")
        .eq("sucursal_id", userInfo.sucursal_id)
        .eq("activo", true)
        .neq("id", userInfo.id); // Excluir al gerente mismo

      if (empError) throw empError;

      // Obtener evaluaciones del mes actual
      const { data: evaluaciones, error: evalError } = await supabase
        .from("evaluaciones_mensuales")
        .select("id, empleado_id, estado")
        .eq("mes", mesActual)
        .eq("anio", anioActual)
        .eq("evaluador_id", userInfo.id);

      if (evalError) throw evalError;

      // Combinar datos
      const empleadosConEstado = empleadosData?.map((emp) => {
        const evaluacion = evaluaciones?.find((e) => e.empleado_id === emp.id);
        return {
          ...emp,
          evaluacion_id: evaluacion?.id,
          estado_evaluacion: evaluacion?.estado || "sin_evaluar",
        };
      }) || [];

      setEmpleados(empleadosConEstado);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Error al cargar empleados");
    } finally {
      setLoading(false);
    }
  };

  const handleIniciarEvaluacion = async (empleado: Empleado) => {
    try {
      const mesActual = new Date().getMonth() + 1;
      const anioActual = new Date().getFullYear();

      // Verificar si ya existe evaluación
      if (empleado.evaluacion_id) {
        setSelectedEmpleado(empleado);
        setShowForm(true);
        return;
      }

      // Crear nueva evaluación
      const { data, error } = await supabase
        .from("evaluaciones_mensuales")
        .insert({
          empleado_id: empleado.id,
          evaluador_id: userInfo.id,
          mes: mesActual,
          anio: anioActual,
          estado: "pendiente",
        })
        .select()
        .single();

      if (error) throw error;

      setSelectedEmpleado({ ...empleado, evaluacion_id: data.id });
      setShowForm(true);
      toast.success("Evaluación iniciada");
    } catch (error) {
      console.error("Error starting evaluation:", error);
      toast.error("Error al iniciar evaluación");
    }
  };

  const handleCerrarFormulario = () => {
    setShowForm(false);
    setSelectedEmpleado(null);
    fetchEmpleados();
    onEvaluacionCompletada();
  };

  if (showForm && selectedEmpleado) {
    return (
      <FormularioEvaluacion
        empleado={selectedEmpleado}
        evaluacionId={selectedEmpleado.evaluacion_id!}
        onClose={handleCerrarFormulario}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Empleados de tu Sucursal</CardTitle>
          <CardDescription>
            Evalúa el desempeño de cada empleado este mes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : empleados.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay empleados para evaluar
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {empleados.map((empleado) => (
                <Card key={empleado.id} className="relative">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {empleado.nombre} {empleado.apellido}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {empleado.puesto || "Sin puesto"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {empleado.estado_evaluacion === "completada" && (
                        <div className="text-sm text-green-600 font-medium">
                          ✓ Evaluación completada
                        </div>
                      )}
                      {empleado.estado_evaluacion === "pendiente" && (
                        <div className="text-sm text-orange-600 font-medium">
                          ⏳ Evaluación en progreso
                        </div>
                      )}
                      {empleado.estado_evaluacion === "sin_evaluar" && (
                        <div className="text-sm text-muted-foreground">
                          Sin evaluar este mes
                        </div>
                      )}
                      
                      <Button
                        onClick={() => handleIniciarEvaluacion(empleado)}
                        className="w-full"
                        variant={
                          empleado.estado_evaluacion === "completada"
                            ? "outline"
                            : "default"
                        }
                      >
                        {empleado.estado_evaluacion === "completada" ? (
                          "Ver Evaluación"
                        ) : empleado.estado_evaluacion === "pendiente" ? (
                          "Continuar Evaluación"
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Iniciar Evaluación
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
