import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, ClipboardList, DollarSign, CheckCircle, Printer, Wallet, Check } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { imprimirTareasDiariasAutomatico } from "@/utils/printManager"
import { registrarActividadTarea } from "@/lib/tareasLogService"

interface TareaPendiente {
  id: string
  titulo: string
  descripcion: string | null
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  fecha_limite: string | null
  estado: string
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
  const [vistaActual, setVistaActual] = useState<'menu' | 'tareas' | 'adelantos' | 'saldo'>('menu')
  const [consultandoSaldo, setConsultandoSaldo] = useState(false)
  const [saldoCuentaCorriente, setSaldoCuentaCorriente] = useState<any>(null)
  const [completandoTarea, setCompletandoTarea] = useState<string | null>(null)

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

    // Registrar consulta de tareas cuando se carga la página
    if (empleadoId) {
      registrarActividadTarea(
        '', // No hay tarea específica, es una consulta general
        empleadoId,
        'consultada',
        'kiosco_autogestion',
        { tipo: 'consulta_general' }
      ).catch(console.error)
    }
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

      // Cargar tareas pendientes y en progreso
      const { data: tareas, error: tareasError } = await supabase
        .from('tareas')
        .select('id, titulo, descripcion, prioridad, fecha_limite, estado')
        .eq('asignado_a', empleadoId)
        .in('estado', ['pendiente', 'en_progreso'])
        .order('prioridad', { ascending: false })
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

  const consultarSaldo = async () => {
    setConsultandoSaldo(true)
    setVistaActual('saldo')
    setSaldoCuentaCorriente(null)
    
    try {
      // Obtener el id_centum del empleado
      const { data: datosEmpleado, error: errorEmpleado } = await supabase
        .from('empleados_datos_sensibles')
        .select('id_centum')
        .eq('empleado_id', empleadoId)
        .single()

      if (errorEmpleado || !datosEmpleado?.id_centum) {
        throw new Error('No se encontró el ID de Centum del empleado')
      }

      // Llamar al edge function que actúa como proxy a n8n
      const { data: saldoData, error: saldoError } = await supabase.functions.invoke(
        'consultar-saldo-centum',
        {
          body: {
            centum_id: datosEmpleado.id_centum
          }
        }
      )

      if (saldoError) {
        throw new Error(saldoError.message || 'Error al consultar saldo')
      }

      // El saldo viene directamente como número desde n8n a través del edge function
      const saldo = typeof saldoData === 'number' ? saldoData : saldoData.saldo
      
      setSaldoCuentaCorriente(saldo)
      toast({
        title: "✅ Saldo consultado",
        description: "El saldo se obtuvo correctamente desde Centum",
      })

    } catch (error) {
      console.error('Error consultando saldo:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo consultar el saldo. Intente nuevamente.",
        variant: "destructive"
      })
      setVistaActual('menu')
    } finally {
      setConsultandoSaldo(false)
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
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    fechaObj.setHours(0, 0, 0, 0)
    
    const diffDays = Math.ceil((fechaObj.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return `⚠️ Vencida hace ${Math.abs(diffDays)} día(s)`
    if (diffDays === 0) return '🔴 Vence hoy'
    if (diffDays === 1) return '🟠 Vence mañana'
    if (diffDays <= 3) return `🟡 Vence en ${diffDays} días`
    return fechaObj.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getEstadoBadge = (estado: string) => {
    if (estado === 'en_progreso') {
      return <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">En progreso</span>
    }
    return <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">Pendiente</span>
  }

  const completarTarea = async (tareaId: string) => {
    if (!empleadoId) return
    
    setCompletandoTarea(tareaId)
    try {
      // Actualizar estado de la tarea
      const { error } = await supabase
        .from('tareas')
        .update({
          estado: 'completada',
          fecha_completada: new Date().toISOString()
        })
        .eq('id', tareaId)

      if (error) throw error

      // Registrar log de tarea completada desde autogestión
      await registrarActividadTarea(
        tareaId,
        empleadoId,
        'completada',
        'kiosco_autogestion',
        { 
          completado_desde: 'autogestion',
          fecha: new Date().toISOString()
        }
      )

      toast({
        title: "✅ Tarea completada",
        description: "La tarea ha sido marcada como completada",
        duration: 3000
      })

      // Recargar lista de tareas
      cargarDatosEmpleado()
    } catch (error) {
      console.error('Error completando tarea:', error)
      toast({
        title: "Error",
        description: "No se pudo completar la tarea",
        variant: "destructive"
      })
    } finally {
      setCompletandoTarea(null)
    }
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

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={consultarSaldo}
            >
              <CardContent className="p-8">
                <div className="flex items-center space-x-4">
                  <div className="bg-indigo-100 p-4 rounded-full">
                    <Wallet className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">Consultar Saldo</h3>
                    <p className="text-gray-600 mt-1">
                      Ver saldo de cuenta corriente
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Vista de Saldo */}
        {vistaActual === 'saldo' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Wallet className="h-6 w-6" />
                  <span>Saldo de Cuenta Corriente</span>
                </CardTitle>
                <Button variant="outline" onClick={() => setVistaActual('menu')}>
                  Volver
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {consultandoSaldo ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Consultando saldo...</p>
                </div>
              ) : saldoCuentaCorriente !== null ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-8 text-white shadow-lg">
                    <p className="text-sm opacity-90 mb-2">Saldo Disponible</p>
                    <p className="text-4xl font-bold">
                      ${typeof saldoCuentaCorriente === 'number' 
                        ? saldoCuentaCorriente.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : (saldoCuentaCorriente.saldo || saldoCuentaCorriente).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  
                  <div className="text-center text-sm text-gray-500">
                    Consultado: {new Date().toLocaleString('es-AR')}
                  </div>
                  
                  <Button 
                    onClick={consultarSaldo}
                    variant="outline"
                    className="w-full"
                  >
                    Actualizar Saldo
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600">No se pudo obtener el saldo</p>
                </div>
              )}
            </CardContent>
          </Card>
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
                        <div className="font-semibold text-lg mb-2 flex items-center justify-between">
                          <span>{tarea.titulo}</span>
                          {getEstadoBadge(tarea.estado)}
                        </div>
                        {tarea.descripcion && (
                          <p className="text-sm mb-2 opacity-90">{tarea.descripcion}</p>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium capitalize">{tarea.prioridad}</span>
                          <span>{formatFechaLimite(tarea.fecha_limite)}</span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-current/20">
                          <Button
                            size="sm"
                            onClick={() => completarTarea(tarea.id)}
                            disabled={completandoTarea === tarea.id}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                          >
                            {completandoTarea === tarea.id ? (
                              <span className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Completando...
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <Check className="h-4 w-4 mr-2" />
                                Marcar como Completada
                              </span>
                            )}
                          </Button>
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
