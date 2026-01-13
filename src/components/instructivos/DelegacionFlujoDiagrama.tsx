import { 
  MousePointerClick, 
  Users, 
  Search, 
  UserCheck, 
  MessageSquare, 
  CheckCircle2, 
  History, 
  Bell,
  ArrowRight,
  ArrowDown
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface PasoProps {
  numero: number
  titulo: string
  descripcion: string
  icono: React.ReactNode
  color: string
  isLast?: boolean
}

function PasoFlujo({ numero, titulo, descripcion, icono, color, isLast = false }: PasoProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <Card className={`w-full md:w-40 border-2 hover:shadow-lg transition-all duration-300 hover:scale-105 ${color}`}>
          <CardContent className="p-4 flex flex-col items-center text-center">
            {/* Número de paso */}
            <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-md">
              {numero}
            </div>
            
            {/* Icono */}
            <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center mb-2 shadow-sm">
              {icono}
            </div>
            
            {/* Título */}
            <h4 className="font-semibold text-xs mb-1">{titulo}</h4>
            
            {/* Descripción */}
            <p className="text-[10px] text-muted-foreground leading-tight">{descripcion}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Flecha de conexión */}
      {!isLast && (
        <>
          <ArrowDown className="h-6 w-6 text-muted-foreground my-2 md:hidden" />
          <ArrowRight className="h-6 w-6 text-muted-foreground mx-2 hidden md:block" />
        </>
      )}
    </div>
  )
}

export function DelegacionFlujoDiagrama() {
  const pasos = [
    {
      numero: 1,
      titulo: "Seleccionar Tarea",
      descripcion: "Identificar la tarea a delegar en el listado",
      icono: <MousePointerClick className="h-5 w-5 text-blue-500" />,
      color: "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20"
    },
    {
      numero: 2,
      titulo: "Abrir Delegación",
      descripcion: "Clic en el botón de delegar (icono usuarios)",
      icono: <Users className="h-5 w-5 text-purple-500" />,
      color: "border-purple-200 bg-purple-50/50 dark:bg-purple-950/20"
    },
    {
      numero: 3,
      titulo: "Buscar Empleado",
      descripcion: "Usar el buscador para encontrar al destinatario",
      icono: <Search className="h-5 w-5 text-orange-500" />,
      color: "border-orange-200 bg-orange-50/50 dark:bg-orange-950/20"
    },
    {
      numero: 4,
      titulo: "Seleccionar Destino",
      descripcion: "Elegir el empleado que recibirá la tarea",
      icono: <UserCheck className="h-5 w-5 text-teal-500" />,
      color: "border-teal-200 bg-teal-50/50 dark:bg-teal-950/20"
    },
    {
      numero: 5,
      titulo: "Agregar Comentario",
      descripcion: "Opcional: explicar contexto o instrucciones",
      icono: <MessageSquare className="h-5 w-5 text-pink-500" />,
      color: "border-pink-200 bg-pink-50/50 dark:bg-pink-950/20"
    },
    {
      numero: 6,
      titulo: "Confirmar",
      descripcion: "Clic en 'Delegar Tarea' para completar",
      icono: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      color: "border-green-200 bg-green-50/50 dark:bg-green-950/20"
    },
    {
      numero: 7,
      titulo: "Registro en Historial",
      descripcion: "El sistema guarda la acción automáticamente",
      icono: <History className="h-5 w-5 text-slate-500" />,
      color: "border-slate-200 bg-slate-50/50 dark:bg-slate-950/20"
    },
    {
      numero: 8,
      titulo: "Notificación",
      descripcion: "El empleado recibe notificación de la tarea",
      icono: <Bell className="h-5 w-5 text-yellow-500" />,
      color: "border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20"
    }
  ]

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[320px] p-4">
        {/* Mobile: Vertical flow */}
        <div className="md:hidden space-y-2">
          {pasos.map((paso, index) => (
            <div key={paso.numero} className="flex flex-col items-center">
              <Card className={`w-full border-2 ${paso.color}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                    {paso.numero}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shrink-0">
                    {paso.icono}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{paso.titulo}</h4>
                    <p className="text-xs text-muted-foreground">{paso.descripcion}</p>
                  </div>
                </CardContent>
              </Card>
              {index < pasos.length - 1 && (
                <ArrowDown className="h-5 w-5 text-muted-foreground my-1" />
              )}
            </div>
          ))}
        </div>

        {/* Desktop: Horizontal flow in two rows */}
        <div className="hidden md:block">
          {/* Primera fila: pasos 1-4 */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {pasos.slice(0, 4).map((paso, index) => (
              <div key={paso.numero} className="flex items-center">
                <PasoFlujo {...paso} isLast={index === 3} />
                {index < 3 && <ArrowRight className="h-6 w-6 text-muted-foreground mx-2" />}
              </div>
            ))}
          </div>
          
          {/* Conector visual entre filas */}
          <div className="flex justify-end mr-20 mb-4">
            <ArrowDown className="h-6 w-6 text-muted-foreground" />
          </div>
          
          {/* Segunda fila: pasos 5-8 */}
          <div className="flex items-center justify-center gap-4">
            {pasos.slice(4).map((paso, index) => (
              <div key={paso.numero} className="flex items-center">
                <PasoFlujo {...paso} isLast={index === 3} />
                {index < 3 && <ArrowRight className="h-6 w-6 text-muted-foreground mx-2" />}
              </div>
            ))}
          </div>
        </div>

        {/* Indicador de tiempo estimado */}
        <div className="mt-6 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm">
            ⏱️ Tiempo estimado: <strong>30 segundos</strong>
          </span>
        </div>
      </div>
    </div>
  )
}
