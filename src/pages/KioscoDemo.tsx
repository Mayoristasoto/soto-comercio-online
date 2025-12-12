import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Users, Clock, CheckCircle, ArrowLeft, Printer, FileText } from "lucide-react";
import { ConfirmarTareasDia } from "@/components/fichero/ConfirmarTareasDia";
import { previewTareasDiarias } from "@/utils/printManager";
import { useNavigate } from "react-router-dom";

interface EmpleadoDemo {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
  email: string;
}

interface TareaPendiente {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  fecha_limite: string | null;
}

const DEMO_EMPLEADOS: EmpleadoDemo[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    nombre: 'Juan',
    apellido: 'Demo Empleado',
    rol: 'empleado',
    email: 'demo.empleado@test.com'
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    nombre: 'María',
    apellido: 'Demo Gerente',
    rol: 'gerente_sucursal',
    email: 'demo.gerente@test.com'
  }
];

const priorityColors = {
  baja: 'bg-green-100 text-green-800 border-green-200',
  media: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  alta: 'bg-orange-100 text-orange-800 border-orange-200',
  urgente: 'bg-red-100 text-red-800 border-red-200'
};

export default function KioscoDemo() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedEmpleado, setSelectedEmpleado] = useState<EmpleadoDemo | null>(null);
  const [tareasPendientes, setTareasPendientes] = useState<TareaPendiente[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirmarTareas, setShowConfirmarTareas] = useState(false);
  const [simulatingRecognition, setSimulatingRecognition] = useState(false);
  const [recognitionComplete, setRecognitionComplete] = useState(false);

  const handleSelectEmpleado = async (empleado: EmpleadoDemo) => {
    setSelectedEmpleado(empleado);
    setSimulatingRecognition(true);
    setRecognitionComplete(false);
    
    // Simular proceso de reconocimiento facial
    toast({
      title: "🔍 Procesando reconocimiento facial...",
      description: `Analizando rostro de ${empleado.nombre} ${empleado.apellido}`,
    });

    // Simular delay de reconocimiento
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: "✅ Reconocimiento exitoso",
      description: `Confianza: 95.2% - ${empleado.nombre} ${empleado.apellido}`,
    });

    setSimulatingRecognition(false);
    setRecognitionComplete(true);

    // Cargar tareas pendientes
    await loadTareasPendientes(empleado.id);
  };

  const loadTareasPendientes = async (empleadoId: string) => {
    setLoading(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('tareas')
        .select('id, titulo, descripcion, prioridad, fecha_limite')
        .eq('asignado_a', empleadoId)
        .eq('estado', 'pendiente')
        .order('prioridad', { ascending: false });

      if (error) throw error;

      setTareasPendientes(data || []);

      if (data && data.length > 0) {
        toast({
          title: "📋 Tareas pendientes",
          description: `Tienes ${data.length} tarea(s) pendiente(s)`,
        });
      } else {
        toast({
          title: "🎉 Sin tareas pendientes",
          description: "No tienes tareas asignadas actualmente",
        });
      }
    } catch (error) {
      console.error('Error cargando tareas:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las tareas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSimularEntrada = () => {
    toast({
      title: "✅ Entrada registrada",
      description: `${selectedEmpleado?.nombre} ${selectedEmpleado?.apellido} - ${new Date().toLocaleTimeString()}`,
    });
  };

  const handleSimularSalida = () => {
    // Si es gerente y tiene tareas pendientes, mostrar confirmación
    if (selectedEmpleado?.rol === 'gerente_sucursal' && tareasPendientes.length > 0) {
      setShowConfirmarTareas(true);
    } else {
      toast({
        title: "👋 Salida registrada",
        description: `${selectedEmpleado?.nombre} ${selectedEmpleado?.apellido} - ${new Date().toLocaleTimeString()}`,
      });
    }
  };

  const handleConfirmarTareas = () => {
    toast({
      title: "👋 Salida registrada",
      description: `Tareas confirmadas. ${selectedEmpleado?.nombre} ${selectedEmpleado?.apellido} - ${new Date().toLocaleTimeString()}`,
    });
  };

  const handleImprimirTareas = async () => {
    if (!selectedEmpleado) return;

    try {
      await previewTareasDiarias({
        id: selectedEmpleado.id,
        nombre: selectedEmpleado.nombre,
        apellido: selectedEmpleado.apellido
      }, 'termica');
    } catch (error) {
      console.error('Error imprimiendo:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF de tareas",
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
    setSelectedEmpleado(null);
    setTareasPendientes([]);
    setRecognitionComplete(false);
    setSimulatingRecognition(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🧪 Kiosco Demo - Prueba de Tareas</h1>
            <p className="text-muted-foreground">
              Simula el reconocimiento facial para probar asignación y confirmación de tareas
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>

        {!selectedEmpleado ? (
          /* Selección de usuario demo */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Seleccionar Usuario Demo
              </CardTitle>
              <CardDescription>
                Haz clic en un usuario para simular su reconocimiento facial
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              {DEMO_EMPLEADOS.map((empleado) => (
                <Card 
                  key={empleado.id} 
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleSelectEmpleado(empleado)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="bg-primary/10 text-lg">
                          {empleado.nombre[0]}{empleado.apellido[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {empleado.nombre} {empleado.apellido}
                        </h3>
                        <p className="text-sm text-muted-foreground">{empleado.email}</p>
                        <Badge 
                          variant={empleado.rol === 'gerente_sucursal' ? 'default' : 'secondary'}
                          className="mt-2"
                        >
                          {empleado.rol === 'gerente_sucursal' ? '👔 Gerente Sucursal' : '👤 Empleado'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        ) : (
          /* Panel después del reconocimiento */
          <div className="space-y-4">
            {/* Info del empleado reconocido */}
            <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="bg-green-500 text-white text-xl">
                        {selectedEmpleado.nombre[0]}{selectedEmpleado.apellido[0]}
                      </AvatarFallback>
                    </Avatar>
                    {recognitionComplete && (
                      <CheckCircle className="absolute -bottom-1 -right-1 h-6 w-6 text-green-500 bg-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">
                        {selectedEmpleado.nombre} {selectedEmpleado.apellido}
                      </h2>
                      <Badge variant="outline" className="bg-green-100 text-green-700">
                        ✓ Reconocido
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{selectedEmpleado.email}</p>
                    <Badge 
                      variant={selectedEmpleado.rol === 'gerente_sucursal' ? 'default' : 'secondary'}
                      className="mt-1"
                    >
                      {selectedEmpleado.rol === 'gerente_sucursal' ? '👔 Gerente Sucursal' : '👤 Empleado'}
                    </Badge>
                  </div>
                  <Button variant="ghost" onClick={handleReset}>
                    Cambiar usuario
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Acciones de fichaje */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Acciones de Fichaje (Simulación)
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleSimularEntrada}
                  disabled={simulatingRecognition}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Registrar Entrada
                </Button>
                <Button 
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleSimularSalida}
                  disabled={simulatingRecognition}
                >
                  Finalizar Jornada
                </Button>
              </CardContent>
            </Card>

            {/* Tareas pendientes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Tareas Pendientes ({tareasPendientes.length})
                  </span>
                  {tareasPendientes.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleImprimirTareas}>
                      <Printer className="h-4 w-4 mr-2" />
                      Imprimir
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : tareasPendientes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Sin tareas pendientes</p>
                    <p className="text-sm">Asigna tareas desde el panel de administración</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tareasPendientes.map((tarea) => (
                      <div
                        key={tarea.id}
                        className="flex items-start gap-3 p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">{tarea.titulo}</h4>
                          {tarea.descripcion && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {tarea.descripcion}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className={priorityColors[tarea.prioridad]}>
                              {tarea.prioridad}
                            </Badge>
                            {tarea.fecha_limite && (
                              <span className="text-xs text-muted-foreground">
                                Vence: {new Date(tarea.fecha_limite).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Nota informativa */}
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
              <CardContent className="p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>💡 Nota:</strong> Esta es una página de prueba. Para asignar tareas a estos usuarios demo, 
                  ve a <strong>Tareas</strong> en el menú de administración y asígnalas a "Juan Demo Empleado" 
                  o "María Demo Gerente".
                  {selectedEmpleado?.rol === 'gerente_sucursal' && (
                    <span className="block mt-2">
                      <strong>📋 Gerente:</strong> Al hacer clic en "Finalizar Jornada" con tareas pendientes, 
                      se mostrará el diálogo de confirmación de tareas del día.
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Diálogo de confirmación de tareas (para gerentes) */}
      {selectedEmpleado && (
        <ConfirmarTareasDia
          open={showConfirmarTareas}
          onOpenChange={setShowConfirmarTareas}
          empleadoId={selectedEmpleado.id}
          onConfirm={handleConfirmarTareas}
        />
      )}
    </div>
  );
}
