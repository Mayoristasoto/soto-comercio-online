import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, ClipboardList, DollarSign, CheckCircle, Printer } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { imprimirTareasDiariasAutomatico } from "@/utils/printManager"

interface TareaPendiente {
  id: string
  titulo: string
  descripcion: string | null
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  fecha_limite: string | null
}

interface EmpleadoData {
  id: string
  nombre: string
  apellido: string
}

const MONTOS_ADELANTO = [10000, 20000, 50000, 100000]

export default function Autogestion() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const empleadoId = searchParams.get('empleado')
  
  const [empleado, setEmpleado] = useState<EmpleadoData | null>(null)
  const [tareasPendientes, setTareasPendientes] = useState<TareaPendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [solicitandoAdelanto, setSolicitandoAdelanto] = useState(false)
  const [vistaActual, setVistaActual] = useState<'menu' | 'tareas' | 'adelantos'>('menu')

  useEffect(() => {
    if (!empleadoId) {
      toast({
        title: "Error",
        description: "No se identificó el empleado",
        variant: "destructive"
      })
      navigate('/kiosco')
      return
    }

    cargarDatosEmpleado()
  }, [empleadoId])

  const cargarDatosEmpleado = async () => {
    try {
      setLoading(true)
      
      // Cargar datos del empleado
      const { data: empData, error: empError } = await supabase
        .from('empleados')
        .select('id, nombre, apellido')
        .eq('id', empleadoId)
        .single()

      if (empError) throw empError
      setEmpleado(empData)

      // Cargar tareas pendientes
      const { data: tareas, error: tareasError } = await supabase
        .from('tareas')
        .select('id, titulo, descripcion, prioridad, fecha_limite')
        .eq('asignado_a', empleadoId)
        .eq('estado', 'pendiente')
        .order('fecha_limite', { ascending: true })

      if (tareasError) throw tareasError
      setTareasPendientes(tareas || [])

    } catch (error) {
      console.error('Error cargando datos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const solicitarAdelanto = async (monto: number) => {
    setSolicitandoAdelanto(true)
    try {
      // Insertar solicitud de adelanto en el sistema nuevo
      const { error } = await supabase
        .from('solicitudes_generales')
        .insert({
          empleado_id: empleadoId,
          tipo_solicitud: 'adelanto_sueldo',
          fecha_solicitud: new Date().toISOString().split('T')[0],
          monto: monto,
          descripcion: `Solicitud de adelanto de $${monto.toLocaleString('es-AR')}`,
          estado: 'pendiente'
        })

      if (error) throw error

      toast({
        title: "✅ Solicitud enviada",
        description: `Se solicitó un adelanto de $${monto.toLocaleString('es-AR')}. Será revisada por RRHH.`,
        duration: 5000
      })

      setTimeout(() => {
        navigate('/kiosco')
      }, 2000)

    } catch (error) {
      console.error('Error solicitando adelanto:', error)
      toast({
        title: "Error",
        description: "No se pudo enviar la solicitud. Intente nuevamente.",
        variant: "destructive"
      })
    } finally {
      setSolicitandoAdelanto(false)
    }
  }

  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente':
        return 'bg-red-100 border-red-300 text-red-800'
      case 'alta':
        return 'bg-orange-100 border-orange-300 text-orange-800'
      case 'media':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'baja':
        return 'bg-green-100 border-green-300 text-green-800'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  const formatFechaLimite = (fecha: string | null) => {
    if (!fecha) return 'Sin fecha límite'
    const fechaObj = new Date(fecha)
    return fechaObj.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const handleReimprimirTareas = async () => {
    if (!empleado) return
    
    try {
      const success = await imprimirTareasDiariasAutomatico(empleado)
      if (success) {
        toast({
          title: "✅ Impresión iniciada",
          description: "Tus tareas están siendo impresas",
        })
      } else {
        toast({
          title: "Información",
          description: "No hay tareas para imprimir o ya se imprimieron hoy",
          variant: "default"
        })
      }
    } catch (error) {
      console.error('Error al imprimir tareas:', error)
      toast({
        title: "Error",
        description: "No se pudieron imprimir las tareas",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando información...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/kiosco')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Kiosco
          </Button>
          
          <Card>
            <CardHeader className="text-center bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="text-2xl">
                Autogestión
              </CardTitle>
              {empleado && (
                <p className="text-purple-100 mt-2">
                  {empleado.nombre} {empleado.apellido}
                </p>
              )}
            </CardHeader>
          </Card>
        </div>

        {/* Menú Principal */}
        {vistaActual === 'menu' && (
          <div className="grid grid-cols-1 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setVistaActual('tareas')}
            >
              <CardContent className="p-8">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-4 rounded-full">
                    <ClipboardList className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">Mis Tareas</h3>
                    <p className="text-gray-600 mt-1">
                      {tareasPendientes.length} tareas pendientes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setVistaActual('adelantos')}
            >
              <CardContent className="p-8">
                <div className="flex items-center space-x-4">
                  <div className="bg-green-100 p-4 rounded-full">
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">Solicitar Adelanto</h3>
                    <p className="text-gray-600 mt-1">
                      Solicita un adelanto de sueldo
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Vista de Tareas */}
        {vistaActual === 'tareas' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <ClipboardList className="h-6 w-6" />
                  <span>Tareas Pendientes</span>
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleReimprimirTareas}
                    disabled={tareasPendientes.length === 0}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </Button>
                  <Button variant="outline" onClick={() => setVistaActual('menu')}>
                    Volver
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {tareasPendientes.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <p className="text-lg text-gray-600">No tienes tareas pendientes</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {tareasPendientes.map((tarea) => (
                    <div
                      key={tarea.id}
                      className={`border-2 rounded-lg p-4 ${getPriorityColor(tarea.prioridad)}`}
                    >
                      <div className="font-semibold text-lg mb-2">{tarea.titulo}</div>
                      {tarea.descripcion && (
                        <p className="text-sm mb-2 opacity-90">{tarea.descripcion}</p>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium capitalize">{tarea.prioridad}</span>
                        <span>Vence: {formatFechaLimite(tarea.fecha_limite)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Vista de Adelantos */}
        {vistaActual === 'adelantos' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-6 w-6" />
                  <span>Solicitar Adelanto</span>
                </CardTitle>
                <Button variant="outline" onClick={() => setVistaActual('menu')}>
                  Volver
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-6 text-center">
                Seleccione el monto del adelanto que necesita
              </p>
              <div className="grid grid-cols-2 gap-4">
                {MONTOS_ADELANTO.map((monto) => (
                  <button
                    key={monto}
                    onClick={() => solicitarAdelanto(monto)}
                    disabled={solicitandoAdelanto}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-6 px-4 rounded-lg text-xl transition-colors duration-200 shadow-lg hover:shadow-xl"
                  >
                    ${monto.toLocaleString('es-AR')}
                  </button>
                ))}
              </div>
              {solicitandoAdelanto && (
                <div className="mt-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Enviando solicitud...</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
