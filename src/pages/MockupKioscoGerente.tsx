import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  ClipboardList, 
  ListTodo, 
  Search,
  ArrowLeft,
  User,
  Calendar,
  Star
} from "lucide-react";

type Screen = "success" | "menu" | "evaluaciones" | "form";

export default function MockupKioscoGerente() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("success");

  // Pantalla 1: Reconocimiento exitoso
  const SuccessScreen = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-20 w-20 text-green-500" />
        </div>
        <CardTitle className="text-3xl text-green-600">¡Reconocimiento Exitoso!</CardTitle>
        <CardDescription className="text-lg mt-2">
          Bienvenido/a, <strong>María González</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rol:</span>
            <Badge variant="secondary" className="text-base">Gerente de Sucursal</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sucursal:</span>
            <span className="font-medium">Centro</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hora de ingreso:</span>
            <span className="font-medium">08:45 AM</span>
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <Button 
            onClick={() => setCurrentScreen("menu")}
            className="w-full h-16 text-lg"
            size="lg"
          >
            <ClipboardList className="mr-2 h-6 w-6" />
            Acceder a Funciones de Gerente
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setCurrentScreen("success")}
          >
            Cerrar sesión
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Pantalla 2: Menú de opciones para gerente
  const MenuScreen = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <Button 
          variant="ghost" 
          onClick={() => setCurrentScreen("success")}
          className="w-fit mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <CardTitle className="text-2xl">Funciones de Gerente</CardTitle>
        <CardDescription>Selecciona una opción</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          onClick={() => setCurrentScreen("evaluaciones")}
          className="w-full h-20 text-lg justify-start"
          variant="outline"
        >
          <div className="flex items-center gap-4">
            <Star className="h-8 w-8 text-primary" />
            <div className="text-left">
              <div className="font-semibold">Evaluaciones Pendientes</div>
              <div className="text-sm text-muted-foreground">3 empleados por evaluar</div>
            </div>
          </div>
          <Badge className="ml-auto" variant="destructive">3</Badge>
        </Button>

        <Button 
          className="w-full h-20 text-lg justify-start"
          variant="outline"
        >
          <div className="flex items-center gap-4">
            <ListTodo className="h-8 w-8 text-primary" />
            <div className="text-left">
              <div className="font-semibold">Tareas Asignadas</div>
              <div className="text-sm text-muted-foreground">Ver y gestionar tareas</div>
            </div>
          </div>
        </Button>

        <Button 
          className="w-full h-20 text-lg justify-start"
          variant="outline"
        >
          <div className="flex items-center gap-4">
            <Search className="h-8 w-8 text-primary" />
            <div className="text-left">
              <div className="font-semibold">Consultas Rápidas</div>
              <div className="text-sm text-muted-foreground">Estado de empleados</div>
            </div>
          </div>
        </Button>
      </CardContent>
    </Card>
  );

  // Pantalla 3: Lista de evaluaciones pendientes
  const EvaluacionesScreen = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <Button 
          variant="ghost" 
          onClick={() => setCurrentScreen("menu")}
          className="w-fit mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al menú
        </Button>
        <CardTitle className="text-2xl">Evaluaciones Pendientes</CardTitle>
        <CardDescription>Empleados de tu sucursal por evaluar este mes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {[
          { nombre: "Juan Pérez", puesto: "Vendedor", estado: "Pendiente" },
          { nombre: "Laura Martínez", puesto: "Cajera", estado: "En progreso" },
          { nombre: "Carlos López", puesto: "Repositor", estado: "Pendiente" }
        ].map((empleado, idx) => (
          <Card key={idx} className="hover:bg-muted/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <User className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <div className="font-semibold">{empleado.nombre}</div>
                    <div className="text-sm text-muted-foreground">{empleado.puesto}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={empleado.estado === "Pendiente" ? "destructive" : "secondary"}>
                    {empleado.estado}
                  </Badge>
                  <Button 
                    onClick={() => setCurrentScreen("form")}
                    size="sm"
                  >
                    {empleado.estado === "En progreso" ? "Continuar" : "Iniciar"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );

  // Pantalla 4: Formulario de evaluación adaptado para kiosco
  const FormScreen = () => (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <Button 
          variant="ghost" 
          onClick={() => setCurrentScreen("evaluaciones")}
          className="w-fit mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a lista
        </Button>
        <div className="flex items-center gap-4">
          <User className="h-12 w-12 text-muted-foreground" />
          <div>
            <CardTitle className="text-2xl">Evaluación de Juan Pérez</CardTitle>
            <CardDescription>Vendedor - Evaluación de Noviembre 2025</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Promedio actual:</span>
              <Badge variant="secondary" className="text-base">7.5 / 10</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Conceptos simulados */}
        <div className="space-y-4">
          {[
            "Puntualidad y asistencia",
            "Calidad del trabajo",
            "Trabajo en equipo",
            "Actitud y compromiso"
          ].map((concepto, idx) => (
            <Card key={idx} className="border-2">
              <CardContent className="p-4">
                <div className="font-semibold mb-3">{concepto}</div>
                <div className="flex gap-2 mb-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <Button
                      key={num}
                      variant={num === 8 ? "default" : "outline"}
                      size="sm"
                      className="w-10 h-10"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
                <textarea 
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="Comentario opcional..."
                  rows={2}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" className="flex-1" size="lg">
            Guardar progreso
          </Button>
          <Button className="flex-1" size="lg">
            Finalizar evaluación
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto mb-6">
        <Badge variant="outline" className="mb-4">
          MOCKUP - Vista Previa de Diseño
        </Badge>
        <h1 className="text-3xl font-bold mb-2">Kiosco para Gerentes - Flujo Completo</h1>
        <p className="text-muted-foreground">
          Este mockup muestra cómo un gerente de sucursal podría acceder a evaluaciones y otras funciones después del reconocimiento facial en el kiosco.
        </p>
        
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => setCurrentScreen("success")}>
            1. Reconocimiento
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentScreen("menu")}>
            2. Menú
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentScreen("evaluaciones")}>
            3. Evaluaciones
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentScreen("form")}>
            4. Formulario
          </Button>
        </div>
      </div>

      <div className="mt-8">
        {currentScreen === "success" && <SuccessScreen />}
        {currentScreen === "menu" && <MenuScreen />}
        {currentScreen === "evaluaciones" && <EvaluacionesScreen />}
        {currentScreen === "form" && <FormScreen />}
      </div>
    </div>
  );
}
