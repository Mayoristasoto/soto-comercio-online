import { useState } from "react"
import { Link } from "react-router-dom"
import { 
  ArrowLeft, 
  Download, 
  BookOpen, 
  Users, 
  Shield, 
  Building, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  History,
  BarChart3,
  FileText,
  Camera,
  LogOut,
  Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Separator } from "@/components/ui/separator"
import { DelegacionJerarquiaDiagrama } from "@/components/instructivos/DelegacionJerarquiaDiagrama"
import { DelegacionFlujoDiagrama } from "@/components/instructivos/DelegacionFlujoDiagrama"

export default function InstructivoDelegacionTareas() {
  const [expandedSection, setExpandedSection] = useState<string | null>("jerarquia")

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/operaciones/tareas">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver a Tareas
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-semibold">Instructivo de Delegación de Tareas</h1>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Introducción */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              ¿Qué es la Delegación de Tareas?
            </CardTitle>
            <CardDescription className="text-base">
              El sistema de delegación permite transferir la responsabilidad de completar una tarea 
              a otro empleado, manteniendo trazabilidad completa del proceso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Redistribución de Carga</h4>
                  <p className="text-xs text-muted-foreground">Balance de trabajo entre el equipo</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                <History className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Trazabilidad Completa</h4>
                  <p className="text-xs text-muted-foreground">Historial de todas las delegaciones</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
                <Clock className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Seguimiento de Plazos</h4>
                  <p className="text-xs text-muted-foreground">Control de fechas límite</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sección 1: Jerarquía de Delegación */}
        <Card className="mb-6">
          <CardHeader 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => toggleSection("jerarquia")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">1. Jerarquía de Delegación</CardTitle>
                  <CardDescription>Quién puede delegar a quién según el rol</CardDescription>
                </div>
              </div>
              {expandedSection === "jerarquia" ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {expandedSection === "jerarquia" && (
            <CardContent className="pt-0">
              <DelegacionJerarquiaDiagrama />
              
              {/* Tabla de permisos */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Rol</th>
                      <th className="text-left py-2 px-3 font-medium">Puede Delegar A</th>
                      <th className="text-left py-2 px-3 font-medium">Restricciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          <span className="font-medium">Admin RRHH</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">Gerentes y Empleados de cualquier sucursal</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-xs">Sin restricciones</Badge>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">Gerente</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">Empleados de su sucursal</td>
                      <td className="py-2 px-3">
                        <Badge variant="secondary" className="text-xs">Solo su sucursal</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-green-500" />
                          <span className="font-medium">Empleado</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">Otros empleados (re-delegación)</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                          Si está habilitado
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Sección 2: Flujo del Proceso */}
        <Card className="mb-6">
          <CardHeader 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => toggleSection("flujo")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Layers className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">2. Flujo del Proceso de Delegación</CardTitle>
                  <CardDescription>Pasos para delegar una tarea correctamente</CardDescription>
                </div>
              </div>
              {expandedSection === "flujo" ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {expandedSection === "flujo" && (
            <CardContent className="pt-0">
              <DelegacionFlujoDiagrama />
            </CardContent>
          )}
        </Card>

        {/* Sección 3: Verificación al Finalizar Jornada */}
        <Card className="mb-6 border-orange-200 dark:border-orange-900">
          <CardHeader 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => toggleSection("verificacion")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <LogOut className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">3. Verificación de Tareas al Finalizar Jornada</CardTitle>
                  <CardDescription>Control automático al registrar salida</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500">Activo</Badge>
                {expandedSection === "verificacion" ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
          {expandedSection === "verificacion" && (
            <CardContent className="pt-0 space-y-6">
              <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg border border-orange-200 dark:border-orange-900">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">¿Cuándo se activa?</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Al registrar "salida" en el Kiosco o Fichero, el sistema verifica automáticamente 
                      si tienes tareas pendientes con fecha límite del día actual o vencidas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Tareas que se muestran
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">Hoy</Badge>
                      <span className="text-muted-foreground">Tareas con fecha límite hoy</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="destructive">Vencida</Badge>
                      <span className="text-muted-foreground">Tareas con fecha ya pasada</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary">Delegada</Badge>
                      <span className="text-muted-foreground">Indicador si fue delegada</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Opciones disponibles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Marcar tareas como completadas individualmente</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <LogOut className="h-4 w-4 text-blue-500 mt-0.5" />
                      <span>Confirmar y salir (registra las marcadas)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-gray-500 mt-0.5" />
                      <span>Omitir por ahora (cierra sin cambios)</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Sección 4: Funcionalidades Avanzadas */}
        <Card className="mb-6">
          <CardHeader 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => toggleSection("avanzadas")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">4. Funcionalidades Avanzadas</CardTitle>
                  <CardDescription>Herramientas adicionales para gestión de tareas</CardDescription>
                </div>
              </div>
              {expandedSection === "avanzadas" ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {expandedSection === "avanzadas" && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Layers className="h-5 w-5 text-indigo-500" />
                      <h4 className="font-medium text-sm">Delegación Masiva</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Selecciona múltiples tareas y deléga todas a un empleado en una sola acción.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <History className="h-5 w-5 text-slate-500" />
                      <h4 className="font-medium text-sm">Historial de Delegaciones</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Consulta quién delegó a quién y cuándo para cada tarea específica.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <BarChart3 className="h-5 w-5 text-emerald-500" />
                      <h4 className="font-medium text-sm">Dashboard de Carga</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Visualiza la carga de trabajo de cada empleado antes de delegar.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-cyan-500" />
                      <h4 className="font-medium text-sm">Plantillas de Tareas</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Crea tareas recurrentes desde plantillas predefinidas.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Camera className="h-5 w-5 text-pink-500" />
                      <h4 className="font-medium text-sm">Evidencia Fotográfica</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Adjunta fotos como evidencia de tareas completadas.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="h-5 w-5 text-amber-500" />
                      <h4 className="font-medium text-sm">Tareas de Feriados</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Asignación especial de personal para días feriados.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Sección 5: Preguntas Frecuentes */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <CardTitle className="text-lg">5. Preguntas Frecuentes</CardTitle>
                <CardDescription>Respuestas a las dudas más comunes</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="q1">
                <AccordionTrigger className="text-sm">
                  ¿Qué pasa si delego una tarea y el empleado no la completa?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  La tarea permanecerá asignada al empleado. Puedes ver el estado en tiempo real 
                  desde tu panel de tareas delegadas. Si la fecha límite pasa, la tarea aparecerá 
                  como vencida y el empleado recibirá recordatorios al finalizar su jornada.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="q2">
                <AccordionTrigger className="text-sm">
                  ¿Puedo cancelar una delegación?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Sí, puedes volver a delegar la tarea a otro empleado o a ti mismo. 
                  Esto quedará registrado en el historial de la tarea.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="q3">
                <AccordionTrigger className="text-sm">
                  ¿Cómo veo el historial de una tarea delegada?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  En cada tarjeta de tarea hay un ícono de historial (reloj). 
                  Al hacer clic, verás todas las delegaciones realizadas, 
                  incluyendo fechas, usuarios origen y destino, y comentarios.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="q4">
                <AccordionTrigger className="text-sm">
                  ¿Qué significa "tarea re-delegada"?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Significa que la tarea fue delegada más de una vez. Por ejemplo, 
                  un gerente delegó a un empleado, y ese empleado la re-delegó a otro compañero 
                  (si tiene el permiso habilitado).
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="q5">
                <AccordionTrigger className="text-sm">
                  ¿Puedo delegar tareas a empleados de otra sucursal?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Solo si eres Admin RRHH. Los gerentes de sucursal solo pueden 
                  delegar a empleados de su propia sucursal.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="q6">
                <AccordionTrigger className="text-sm">
                  ¿Las tareas vencidas afectan algún indicador?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Sí, el sistema registra las tareas vencidas y pueden afectar 
                  los indicadores de cumplimiento del empleado. Es importante 
                  mantener las tareas al día o solicitar extensiones cuando sea necesario.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Footer con acciones */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground">
            <span>¿Necesitas ayuda adicional? Contacta al área de RRHH</span>
          </div>
          <div className="flex gap-2">
            <Link to="/operaciones/tareas">
              <Button>
                Ir a Gestión de Tareas
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
