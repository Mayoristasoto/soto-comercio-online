import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { 
  Clock, 
  TrendingUp, 
  Users, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Calendar,
  FileText,
  Trash2,
  Check,
  X as XIcon,
  AlertTriangle,
  Filter,
  Shield
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface MetricasResumen {
  total_fichajes_hoy: number
  llegadas_tarde_hoy: number
  pausas_excedidas_hoy: number
  incidencias_pendientes: number
  empleados_puntuales_hoy: number
}

interface FichajeTardio {
  id: string
  empleado_id: string
  fecha_fichaje: string
  hora_programada: string
  hora_real: string
  minutos_retraso: number
  justificado: boolean
  observaciones?: string
  created_at: string
  empleado: {
    nombre: string
    apellido: string
    avatar_url?: string
  }
}

interface PausaExcedida {
  id: string
  empleado_id: string
  fecha_fichaje: string
  hora_inicio_pausa: string
  hora_fin_pausa: string
  duracion_minutos: number
  duracion_permitida_minutos: number
  minutos_exceso: number
  justificado: boolean
  observaciones?: string
  created_at: string
  empleado: {
    nombre: string
    apellido: string
    avatar_url?: string
  }
}

interface IncidenciaReportada {
  id: string
  empleado_id: string
  tipo: string
  descripcion: string
  fecha_incidencia: string
  hora_propuesta?: string
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  comentarios_aprobador?: string
  created_at: string
  empleado: {
    nombre: string
    apellido: string
    avatar_url?: string
  }
}

export default function FichajeMetricasDashboard() {
  const { toast } = useToast()
  const [metricas, setMetricas] = useState<MetricasResumen>({
    total_fichajes_hoy: 0,
    llegadas_tarde_hoy: 0,
    pausas_excedidas_hoy: 0,
    incidencias_pendientes: 0,
    empleados_puntuales_hoy: 0
  })
  const [fichajesToday, setFichajesToday] = useState<FichajeTardio[]>([])
  const [pausasToday, setPausasToday] = useState<PausaExcedida[]>([])
  const [incidenciasPendientes, setIncidenciasPendientes] = useState<IncidenciaReportada[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIncidencia, setSelectedIncidencia] = useState<IncidenciaReportada | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [comentarioAprobacion, setComentarioAprobacion] = useState("")
  const [selectedFichajes, setSelectedFichajes] = useState<Set<string>>(new Set())
  const [selectedPausas, setSelectedPausas] = useState<Set<string>>(new Set())
  
  // Filtros
  const [tipoFecha, setTipoFecha] = useState<'dia' | 'rango'>('dia')
  const [fechaInicio, setFechaInicio] = useState<Date>(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1) // Primer día del mes actual
  })
  const [fechaFin, setFechaFin] = useState<Date>(new Date())
  const [fechaParticular, setFechaParticular] = useState<Date>(new Date())
  const [empleadoFiltro, setEmpleadoFiltro] = useState<string>("todos")
  const [empleados, setEmpleados] = useState<any[]>([])
  const [ocultarRegistradas, setOcultarRegistradas] = useState(false)
  
  // Cruces rojas existentes
  const [crucesRojasExistentes, setCrucesRojasExistentes] = useState<Set<string>>(new Set())

  useEffect(() => {
    cargarEmpleados()
  }, [])
  
  useEffect(() => {
    if (empleados.length > 0) {
      cargarDatos()
    }
  }, [fechaInicio, fechaFin, fechaParticular, tipoFecha, empleadoFiltro, empleados])

  const cargarEmpleados = async () => {
    const { data, error } = await supabase
      .from('empleados')
      .select('id, nombre, apellido')
      .eq('activo', true)
      .order('apellido', { ascending: true })
    
    if (!error && data) {
      setEmpleados(data)
    }
  }

  const cargarDatos = async () => {
    setLoading(true)
    try {
      await Promise.all([
        cargarMetricas(),
        cargarFichajesTardios(),
        cargarPausasExcedidas(),
        cargarIncidenciasPendientes(),
        cargarCrucesRojasExistentes()
      ])
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del dashboard",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const cargarCrucesRojasExistentes = async () => {
    const inicio = tipoFecha === 'dia' ? fechaParticular : fechaInicio
    const fin = tipoFecha === 'dia' ? fechaParticular : fechaFin
    const fechaInicioStr = format(inicio, 'yyyy-MM-dd')
    const fechaFinStr = format(fin, 'yyyy-MM-dd')
    
    const { data, error } = await supabase
      .from('empleado_cruces_rojas')
      .select('empleado_id, fecha_infraccion, tipo_infraccion')
      .gte('fecha_infraccion', fechaInicioStr)
      .lte('fecha_infraccion', fechaFinStr)
      .in('tipo_infraccion', ['llegada_tarde', 'pausa_excedida'])
    
    if (!error && data) {
      const keys = new Set(data.map(cr => `${cr.empleado_id}-${cr.tipo_infraccion}-${cr.fecha_infraccion}`))
      setCrucesRojasExistentes(keys)
    }
  }

  const cargarMetricas = async () => {
    const inicio = tipoFecha === 'dia' ? fechaParticular : fechaInicio
    const fin = tipoFecha === 'dia' ? fechaParticular : fechaFin
    const fechaInicioStr = format(inicio, 'yyyy-MM-dd')
    const fechaFinStr = format(fin, 'yyyy-MM-dd')

    // Construir ventana de tiempo en UTC para cubrir el rango completo en Argentina (-03:00)
    const nextDay = new Date(fin)
    nextDay.setDate(fin.getDate() + 1)
    const nextStr = format(nextDay, 'yyyy-MM-dd')

    const startUtcStr = `${fechaInicioStr}T03:00:00Z` // 00:00 ART del día inicial
    const endUtcStr = `${nextStr}T02:59:59Z`   // 23:59:59 ART del día final

    // Total fichajes del rango (considerando huso horario)
    let fichajesQuery = supabase
      .from('fichajes')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', 'entrada')
      .gte('timestamp_real', startUtcStr)
      .lte('timestamp_real', endUtcStr)
    
    if (empleadoFiltro !== "todos") {
      fichajesQuery = fichajesQuery.eq('empleado_id', empleadoFiltro)
    }

    const { count: totalFichajes } = await fichajesQuery

    // Llegadas tarde del rango
    let tardeQuery = supabase
      .from('fichajes_tardios')
      .select('*', { count: 'exact', head: true })
      .gte('fecha_fichaje', fechaInicioStr)
      .lte('fecha_fichaje', fechaFinStr)
    
    if (empleadoFiltro !== "todos") {
      tardeQuery = tardeQuery.eq('empleado_id', empleadoFiltro)
    }

    const { count: tardeHoy } = await tardeQuery

    // Pausas excedidas del rango
    let pausasQuery = supabase
      .from('fichajes_pausas_excedidas')
      .select('*', { count: 'exact', head: true })
      .gte('fecha_fichaje', fechaInicioStr)
      .lte('fecha_fichaje', fechaFinStr)
    
    if (empleadoFiltro !== "todos") {
      pausasQuery = pausasQuery.eq('empleado_id', empleadoFiltro)
    }

    const { count: pausasHoy } = await pausasQuery

    // Incidencias pendientes (siempre todas)
    const { count: pendientes } = await supabase
      .from('fichaje_incidencias')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'pendiente')

    setMetricas({
      total_fichajes_hoy: totalFichajes || 0,
      llegadas_tarde_hoy: tardeHoy || 0,
      pausas_excedidas_hoy: pausasHoy || 0,
      incidencias_pendientes: pendientes || 0,
      empleados_puntuales_hoy: (totalFichajes || 0) - (tardeHoy || 0)
    })
  }

  const cargarFichajesTardios = async () => {
    const inicio = tipoFecha === 'dia' ? fechaParticular : fechaInicio
    const fin = tipoFecha === 'dia' ? fechaParticular : fechaFin
    const fechaInicioStr = format(inicio, 'yyyy-MM-dd')
    const fechaFinStr = format(fin, 'yyyy-MM-dd')
    
    let query = supabase
      .from('fichajes_tardios')
      .select(`
        *,
        empleado:empleados!inner(nombre, apellido, avatar_url)
      `)
      .gte('fecha_fichaje', fechaInicioStr)
      .lte('fecha_fichaje', fechaFinStr)
    
    if (empleadoFiltro !== "todos") {
      query = query.eq('empleado_id', empleadoFiltro)
    }

    const { data, error } = await query
      .order('fecha_fichaje', { ascending: false })
      .order('minutos_retraso', { ascending: false })

    if (error) throw error
    setFichajesToday(data || [])
  }

  const cargarPausasExcedidas = async () => {
    const inicio = tipoFecha === 'dia' ? fechaParticular : fechaInicio
    const fin = tipoFecha === 'dia' ? fechaParticular : fechaFin
    const fechaInicioStr = format(inicio, 'yyyy-MM-dd')
    const fechaFinStr = format(fin, 'yyyy-MM-dd')
    
    let query = supabase
      .from('fichajes_pausas_excedidas')
      .select(`
        *,
        empleado:empleados!inner(nombre, apellido, avatar_url)
      `)
      .gte('fecha_fichaje', fechaInicioStr)
      .lte('fecha_fichaje', fechaFinStr)
    
    if (empleadoFiltro !== "todos") {
      query = query.eq('empleado_id', empleadoFiltro)
    }

    const { data, error } = await query
      .order('fecha_fichaje', { ascending: false })
      .order('minutos_exceso', { ascending: false })

    if (error) throw error
    setPausasToday(data || [])
  }

  const cargarIncidenciasPendientes = async () => {
    const { data, error } = await supabase
      .from('fichaje_incidencias')
      .select(`
        *,
        empleado:empleados!fichaje_incidencias_empleado_id_fkey(nombre, apellido, avatar_url)
      `)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })

    if (error) throw error
    setIncidenciasPendientes(data || [])
  }

  const eliminarFichajeTardio = async (id: string) => {
    try {
      const { error } = await supabase
        .from('fichajes_tardios')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Registro eliminado",
        description: "El fichaje tardío ha sido eliminado correctamente"
      })

      await cargarDatos()
    } catch (error) {
      console.error('Error eliminando fichaje:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el registro",
        variant: "destructive"
      })
    }
  }

  const eliminarPausaExcedida = async (id: string) => {
    try {
      const { error } = await supabase
        .from('fichajes_pausas_excedidas')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Registro eliminado",
        description: "La pausa excedida ha sido eliminada correctamente"
      })

      await cargarDatos()
    } catch (error) {
      console.error('Error eliminando pausa:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el registro",
        variant: "destructive"
      })
    }
  }

  const abrirDialogoIncidencia = (incidencia: IncidenciaReportada) => {
    setSelectedIncidencia(incidencia)
    setComentarioAprobacion("")
    setDialogOpen(true)
  }

  const aprobarIncidencia = async () => {
    if (!selectedIncidencia) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      const { data: empleado } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', user.id)
        .single()

      const { error } = await supabase
        .from('fichaje_incidencias')
        .update({
          estado: 'aprobada',
          comentarios_aprobador: comentarioAprobacion || null,
          aprobado_por: empleado?.id,
          fecha_aprobacion: new Date().toISOString()
        })
        .eq('id', selectedIncidencia.id)

      if (error) throw error

      toast({
        title: "Incidencia aprobada",
        description: `La incidencia de ${selectedIncidencia.empleado.nombre} ha sido aprobada`
      })

      setDialogOpen(false)
      await cargarDatos()
    } catch (error) {
      console.error('Error aprobando incidencia:', error)
      toast({
        title: "Error",
        description: "No se pudo aprobar la incidencia",
        variant: "destructive"
      })
    }
  }

  const rechazarIncidencia = async () => {
    if (!selectedIncidencia) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      const { data: empleado } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', user.id)
        .single()

      const { error } = await supabase
        .from('fichaje_incidencias')
        .update({
          estado: 'rechazada',
          comentarios_aprobador: comentarioAprobacion || null,
          aprobado_por: empleado?.id,
          fecha_aprobacion: new Date().toISOString()
        })
        .eq('id', selectedIncidencia.id)

      if (error) throw error

      toast({
        title: "Incidencia rechazada",
        description: `La incidencia de ${selectedIncidencia.empleado.nombre} ha sido rechazada`
      })

      setDialogOpen(false)
      await cargarDatos()
    } catch (error) {
      console.error('Error rechazando incidencia:', error)
      toast({
        title: "Error",
        description: "No se pudo rechazar la incidencia",
        variant: "destructive"
      })
    }
  }

  const tieneCruzRoja = (empleadoId: string, tipo: string, fecha: string) => {
    return crucesRojasExistentes.has(`${empleadoId}-${tipo}-${fecha}`)
  }

  // Filtrar incidencias según checkbox
  const fichajesFiltrados = ocultarRegistradas 
    ? fichajesToday.filter(f => !tieneCruzRoja(f.empleado_id, 'llegada_tarde', f.fecha_fichaje))
    : fichajesToday

  const pausasFiltradas = ocultarRegistradas
    ? pausasToday.filter(p => !tieneCruzRoja(p.empleado_id, 'pausa_excedida', p.fecha_fichaje))
    : pausasToday

  const toggleFichajeSelection = (id: string) => {
    const newSelection = new Set(selectedFichajes)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedFichajes(newSelection)
  }

  const toggleAllFichajes = () => {
    if (selectedFichajes.size === fichajesFiltrados.length) {
      setSelectedFichajes(new Set())
    } else {
      setSelectedFichajes(new Set(fichajesFiltrados.map(f => f.id)))
    }
  }

  const togglePausaSelection = (id: string) => {
    const newSelection = new Set(selectedPausas)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedPausas(newSelection)
  }

  const toggleAllPausas = () => {
    if (selectedPausas.size === pausasFiltradas.length) {
      setSelectedPausas(new Set())
    } else {
      setSelectedPausas(new Set(pausasFiltradas.map(p => p.id)))
    }
  }

  const plasmarLlegadasTardeComoRojas = async () => {
    if (selectedFichajes.size === 0) {
      toast({
        title: "Sin selección",
        description: "Seleccione al menos una llegada tarde para plasmar como cruces rojas",
        variant: "destructive"
      })
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      const { data: empleado } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', user.id)
        .single()

      // Crear cruces rojas solo para fichajes seleccionados
      const fichajesSeleccionados = fichajesToday.filter(f => selectedFichajes.has(f.id))
      const crucesRojas = fichajesSeleccionados.map(fichaje => ({
        empleado_id: fichaje.empleado_id,
        fecha_infraccion: fichaje.fecha_fichaje,
        tipo_infraccion: 'llegada_tarde',
        minutos_diferencia: fichaje.minutos_retraso,
        observaciones: `Llegó ${fichaje.minutos_retraso} minutos tarde. Hora programada: ${formatearHora(fichaje.hora_programada)}, Hora real: ${formatearHora(fichaje.hora_real)}`
      }))

      const { error } = await supabase
        .from('empleado_cruces_rojas')
        .insert(crucesRojas)

      if (error) throw error

      toast({
        title: "Cruces rojas plasmadas",
        description: `Se plasmaron ${selectedFichajes.size} llegadas tarde como cruces rojas`
      })

      setSelectedFichajes(new Set())
      await cargarDatos()
    } catch (error) {
      console.error('Error plasmando cruces rojas:', error)
      toast({
        title: "Error",
        description: "No se pudieron plasmar las cruces rojas",
        variant: "destructive"
      })
    }
  }

  const recalcularPausasExcedidas = async () => {
    try {
      toast({
        title: "Recalculando...",
        description: "Corrigiendo timezone de las pausas excedidas"
      })

      // Obtener todos los empleados con pausas hoy
      const { data: pausasActuales } = await supabase
        .from('fichajes_pausas_excedidas')
        .select('empleado_id')
        .eq('fecha_fichaje', new Date().toISOString().split('T')[0])

      if (!pausasActuales || pausasActuales.length === 0) {
        toast({
          title: "Sin datos",
          description: "No hay pausas para recalcular",
          variant: "destructive"
        })
        return
      }

      const empleadoIds = [...new Set(pausasActuales.map(p => p.empleado_id))]

      // Eliminar registros actuales (con timezone incorrecto)
      const { error: deleteError } = await supabase
        .from('fichajes_pausas_excedidas')
        .delete()
        .eq('fecha_fichaje', new Date().toISOString().split('T')[0])
        .in('empleado_id', empleadoIds)

      if (deleteError) throw deleteError

      // Recrear registros con timezone correcto
      for (const empleadoId of empleadoIds) {
        // Obtener todos los pares de pausas del día
        const { data: fichajes, error: fichajesError } = await supabase
          .from('fichajes')
          .select(`
            id,
            tipo,
            timestamp_real,
            empleado_id
          `)
          .eq('empleado_id', empleadoId)
          .gte('timestamp_real', new Date().toISOString().split('T')[0] + 'T00:00:00Z')
          .lte('timestamp_real', new Date().toISOString().split('T')[0] + 'T23:59:59Z')
          .in('tipo', ['pausa_inicio', 'pausa_fin'])
          .eq('estado', 'valido')
          .order('timestamp_real', { ascending: true })

        if (fichajesError) {
          console.error('Error obteniendo fichajes:', fichajesError)
          continue
        }

        // Obtener turno del empleado
        const { data: turnoData } = await supabase
          .from('empleado_turnos')
          .select(`
            turno_id,
            fichado_turnos!inner(
              duracion_pausa_minutos
            )
          `)
          .eq('empleado_id', empleadoId)
          .eq('activo', true)
          .lte('fecha_inicio', new Date().toISOString().split('T')[0])
          .or(`fecha_fin.gte.${new Date().toISOString().split('T')[0]},fecha_fin.is.null`)
          .single()

        if (!turnoData || !turnoData.fichado_turnos?.duracion_pausa_minutos) {
          continue
        }

        const duracionPermitida = turnoData.fichado_turnos.duracion_pausa_minutos

        // Procesar pares de pausas
        for (let i = 0; i < fichajes.length; i++) {
          if (fichajes[i].tipo === 'pausa_inicio' && fichajes[i + 1]?.tipo === 'pausa_fin') {
            const inicio = new Date(fichajes[i].timestamp_real)
            const fin = new Date(fichajes[i + 1].timestamp_real)
            
            // Convertir a hora argentina
            const inicioArt = new Date(inicio.getTime() - 3 * 60 * 60 * 1000)
            const finArt = new Date(fin.getTime() - 3 * 60 * 60 * 1000)
            
            const duracionMin = Math.round((fin.getTime() - inicio.getTime()) / 60000)
            const excesoMin = duracionMin - duracionPermitida

            if (excesoMin >= 1) {
              // Formatear horas en formato HH:MM:SS
              const horaInicio = inicioArt.toTimeString().split(' ')[0]
              const horaFin = finArt.toTimeString().split(' ')[0]

              await supabase
                .from('fichajes_pausas_excedidas')
                .insert({
                  empleado_id: empleadoId,
                  fecha_fichaje: new Date().toISOString().split('T')[0],
                  hora_inicio_pausa: horaInicio,
                  hora_fin_pausa: horaFin,
                  duracion_minutos: duracionMin,
                  duracion_permitida_minutos: duracionPermitida,
                  minutos_exceso: excesoMin,
                  turno_id: turnoData.turno_id
                })
            }
            
            i++ // Saltar el pausa_fin ya procesado
          }
        }
      }

      toast({
        title: "Recálculo completado",
        description: "Las pausas excedidas fueron recalculadas con timezone correcto (hora argentina)"
      })

      await cargarDatos()
    } catch (error) {
      console.error('Error recalculando pausas:', error)
      toast({
        title: "Error",
        description: "No se pudieron recalcular las pausas excedidas",
        variant: "destructive"
      })
    }
  }

  const plasmarPausasExcedidasComoRojas = async () => {
    if (selectedPausas.size === 0) {
      toast({
        title: "Sin selección",
        description: "Seleccione al menos una pausa excedida para plasmar como cruces rojas",
        variant: "destructive"
      })
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      const { data: empleado } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', user.id)
        .single()

      // Crear cruces rojas solo para pausas seleccionadas
      const pausasSeleccionadas = pausasToday.filter(p => selectedPausas.has(p.id))
      const crucesRojas = pausasSeleccionadas.map(pausa => ({
        empleado_id: pausa.empleado_id,
        fecha_infraccion: pausa.fecha_fichaje,
        tipo_infraccion: 'pausa_excedida',
        minutos_diferencia: pausa.minutos_exceso,
        observaciones: `Excedió pausa por ${pausa.minutos_exceso} minutos. Duración: ${pausa.duracion_minutos} min (permitido: ${pausa.duracion_permitida_minutos} min)`
      }))

      const { error } = await supabase
        .from('empleado_cruces_rojas')
        .insert(crucesRojas)

      if (error) throw error

      toast({
        title: "Cruces rojas plasmadas",
        description: `Se plasmaron ${selectedPausas.size} pausas excedidas como cruces rojas`
      })

      setSelectedPausas(new Set())
      await cargarDatos()
    } catch (error) {
      console.error('Error plasmando cruces rojas:', error)
      toast({
        title: "Error",
        description: "No se pudieron plasmar las cruces rojas",
        variant: "destructive"
      })
    }
  }

  const formatearHora = (hora: string): string => {
    if (!hora) return '--:--:--'
    const partes = hora.split('.')
    return partes[0] + ' ART'
  }
  
  const formatearHoraConTooltip = (horaArt: string, createdAtUtc: string) => {
    if (!horaArt || !createdAtUtc) return { display: '--:--:--', tooltip: '' }
    
    const horaLimpia = horaArt.split('.')[0]
    const utcDate = new Date(createdAtUtc)
    const utcHora = utcDate.toISOString().split('T')[1].split('.')[0]
    
    return {
      display: horaLimpia + ' ART',
      tooltip: `Hora UTC: ${utcHora} | Hora Argentina: ${horaLimpia}`
    }
  }

  const obtenerTextoTipo = (tipo: string) => {
    switch (tipo) {
      case 'olvido': return 'Olvido de fichaje'
      case 'error_tecnico': return 'Error técnico'
      case 'justificacion': return 'Justificación'
      case 'correccion': return 'Corrección'
      default: return tipo
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }


  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Seleccione fecha y empleado para ver métricas específicas. <strong>Nota:</strong> Todas las horas mostradas están en zona horaria Argentina (ART = UTC-3)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Tipo de Filtro</label>
                <Select value={tipoFecha} onValueChange={(value: 'dia' | 'rango') => setTipoFecha(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dia">Fecha Particular</SelectItem>
                    <SelectItem value="rango">Rango de Fechas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tipoFecha === 'dia' ? (
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Fecha</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !fechaParticular && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {fechaParticular ? format(fechaParticular, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={fechaParticular}
                        onSelect={(date) => date && setFechaParticular(date)}
                        initialFocus
                        locale={es}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Fecha Inicio</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <Calendar className="mr-2 h-4 w-4" />
                          {format(fechaInicio, "PPP", { locale: es })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={fechaInicio}
                          onSelect={(date) => date && setFechaInicio(date)}
                          locale={es}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Fecha Fin</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <Calendar className="mr-2 h-4 w-4" />
                          {format(fechaFin, "PPP", { locale: es })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={fechaFin}
                          onSelect={(date) => date && setFechaFin(date)}
                          locale={es}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Empleado</label>
              <Select value={empleadoFiltro} onValueChange={setEmpleadoFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los empleados</SelectItem>
                  {empleados.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.apellido}, {emp.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fichajes Periodo</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.total_fichajes_hoy}</div>
            <p className="text-xs text-muted-foreground">Entradas registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Puntuales</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metricas.empleados_puntuales_hoy}</div>
            <p className="text-xs text-muted-foreground">
              {metricas.total_fichajes_hoy > 0 
                ? `${Math.round((metricas.empleados_puntuales_hoy / metricas.total_fichajes_hoy) * 100)}% del total`
                : 'Sin datos'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Llegadas Tarde</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metricas.llegadas_tarde_hoy}</div>
            <p className="text-xs text-muted-foreground">Registros detectados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pausas Excedidas</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{metricas.pausas_excedidas_hoy}</div>
            <p className="text-xs text-muted-foreground">Registros detectados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidencias Pendientes</CardTitle>
            <FileText className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metricas.incidencias_pendientes}</div>
            <p className="text-xs text-muted-foreground">Requieren aprobación</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs con detalles */}
      <Tabs defaultValue="tardios" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="tardios">
              Llegadas Tarde ({fichajesFiltrados.length})
            </TabsTrigger>
            <TabsTrigger value="pausas">
              Pausas Excedidas ({pausasFiltradas.length})
            </TabsTrigger>
            <TabsTrigger value="incidencias">
              Incidencias Pendientes ({incidenciasPendientes.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Checkbox 
              id="ocultar-registradas"
              checked={ocultarRegistradas}
              onCheckedChange={(checked) => setOcultarRegistradas(checked === true)}
            />
            <label 
              htmlFor="ocultar-registradas" 
              className="text-sm font-medium cursor-pointer select-none"
            >
              Ocultar incidencias ya registradas en legajo
            </label>
          </div>
        </div>

        <TabsContent value="tardios" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Fichajes Tardíos de Hoy</CardTitle>
                  <CardDescription>
                    Empleados que llegaron tarde según su horario asignado
                  </CardDescription>
                </div>
                {fichajesFiltrados.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      onClick={toggleAllFichajes}
                      variant="outline"
                      size="sm"
                    >
                      {selectedFichajes.size === fichajesFiltrados.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                    </Button>
                    <Button
                      onClick={plasmarLlegadasTardeComoRojas}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={selectedFichajes.size === 0}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Plasmar como Cruces Rojas ({selectedFichajes.size})
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {fichajesFiltrados.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {fichajesToday.length === 0 ? 'No hay llegadas tarde registradas' : 'Todas las incidencias ya están registradas en legajo'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fichajesFiltrados.map((fichaje) => {
                    const yaRegistrado = tieneCruzRoja(fichaje.empleado_id, 'llegada_tarde', fichaje.fecha_fichaje)
                    
                    return (
                      <div key={fichaje.id} className={`flex items-center gap-3 p-4 border rounded-lg ${yaRegistrado ? 'bg-muted/50' : ''}`}>
                        <Checkbox
                          checked={selectedFichajes.has(fichaje.id)}
                          onCheckedChange={() => toggleFichajeSelection(fichaje.id)}
                          disabled={yaRegistrado}
                        />
                        <div className="flex items-center justify-between flex-1">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <Clock className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {fichaje.empleado.nombre} {fichaje.empleado.apellido}
                                </p>
                                {yaRegistrado && (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                    <Shield className="h-3 w-3 mr-1" />
                                    En Legajo
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground mb-1">
                                <Calendar className="h-3 w-3 inline mr-1" />
                                {new Date(fichaje.fecha_fichaje).toLocaleDateString('es-AR')}
                              </div>
                            <div className="text-sm text-muted-foreground space-x-4">
                              <span>Programada: {formatearHora(fichaje.hora_programada)}</span>
                              <span title={formatearHoraConTooltip(fichaje.hora_real, fichaje.created_at).tooltip}>
                                Llegó: {formatearHoraConTooltip(fichaje.hora_real, fichaje.created_at).display}
                              </span>
                            </div>
                              {fichaje.observaciones && (
                                <p className="text-xs text-muted-foreground mt-1">{fichaje.observaciones}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className="bg-red-100 text-red-800">
                              +{fichaje.minutos_retraso} min
                            </Badge>
                            {!yaRegistrado && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => eliminarFichajeTardio(fichaje.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pausas" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pausas Excedidas de Hoy</CardTitle>
                  <CardDescription>
                    Empleados que excedieron su tiempo de descanso permitido
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={recalcularPausasExcedidas}
                    variant="outline"
                    size="sm"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Recalcular Timezone
                  </Button>
                  {pausasFiltradas.length > 0 && (
                    <>
                      <Button
                        onClick={toggleAllPausas}
                        variant="outline"
                        size="sm"
                      >
                        {selectedPausas.size === pausasFiltradas.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                      </Button>
                      <Button
                        onClick={plasmarPausasExcedidasComoRojas}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={selectedPausas.size === 0}
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Plasmar como Cruces Rojas ({selectedPausas.size})
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {pausasFiltradas.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {pausasToday.length === 0 ? 'No hay pausas excedidas registradas' : 'Todas las incidencias ya están registradas en legajo'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pausasFiltradas.map((pausa) => {
                    const yaRegistrado = tieneCruzRoja(pausa.empleado_id, 'pausa_excedida', pausa.fecha_fichaje)
                    
                    return (
                      <div key={pausa.id} className={`flex items-center gap-3 p-4 border rounded-lg ${yaRegistrado ? 'bg-muted/50' : ''}`}>
                        <Checkbox
                          checked={selectedPausas.has(pausa.id)}
                          onCheckedChange={() => togglePausaSelection(pausa.id)}
                          disabled={yaRegistrado}
                        />
                        <div className="flex items-center justify-between flex-1">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <TrendingUp className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {pausa.empleado.nombre} {pausa.empleado.apellido}
                                </p>
                                {yaRegistrado && (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                    <Shield className="h-3 w-3 mr-1" />
                                    En Legajo
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground mb-1">
                                <Calendar className="h-3 w-3 inline mr-1" />
                                {new Date(pausa.fecha_fichaje).toLocaleDateString('es-AR')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <span 
                                  title={`Inicio: ${formatearHoraConTooltip(pausa.hora_inicio_pausa, pausa.created_at).tooltip} | Fin: ${formatearHoraConTooltip(pausa.hora_fin_pausa, pausa.created_at).tooltip}`}
                                >
                                  {formatearHoraConTooltip(pausa.hora_inicio_pausa, pausa.created_at).display} - {formatearHoraConTooltip(pausa.hora_fin_pausa, pausa.created_at).display}
                                </span>
                                <span className="ml-4">
                                  Duración: {pausa.duracion_minutos} min (permitido: {pausa.duracion_permitida_minutos} min)
                                </span>
                              </div>
                              {pausa.observaciones && (
                                <p className="text-xs text-muted-foreground mt-1">{pausa.observaciones}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className="bg-purple-100 text-purple-800">
                              +{pausa.minutos_exceso} min
                            </Badge>
                            {!yaRegistrado && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => eliminarPausaExcedida(pausa.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidencias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Incidencias Pendientes de Aprobación</CardTitle>
              <CardDescription>
                Solicitudes de corrección de fichaje reportadas por empleados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {incidenciasPendientes.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No hay incidencias pendientes de aprobación
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incidenciasPendientes.map((incidencia) => (
                    <div key={incidencia.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                            <FileText className="h-5 w-5 text-yellow-600" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {incidencia.empleado.nombre} {incidencia.empleado.apellido}
                            </p>
                            <Badge variant="secondary" className="mt-1">
                              {obtenerTextoTipo(incidencia.tipo)}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => abrirDialogoIncidencia(incidencia)}
                        >
                          Revisar
                        </Button>
                      </div>
                      <Separator className="my-2" />
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Fecha incidencia:</span>{" "}
                          <span className="font-medium">
                            {new Date(incidencia.fecha_incidencia).toLocaleDateString('es-AR')}
                          </span>
                          {incidencia.hora_propuesta && (
                            <span className="ml-2 text-muted-foreground">
                              Hora propuesta: {incidencia.hora_propuesta}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Descripción:</span>
                          <p className="mt-1 text-foreground">{incidencia.descripcion}</p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Reportada: {new Date(incidencia.created_at).toLocaleString('es-AR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para aprobar/rechazar incidencias */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Revisar Incidencia</DialogTitle>
            <DialogDescription>
              Apruebe o rechace la solicitud del empleado
            </DialogDescription>
          </DialogHeader>
          
          {selectedIncidencia && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div>
                  <span className="text-sm font-medium">Empleado:</span>
                  <p className="text-sm">
                    {selectedIncidencia.empleado.nombre} {selectedIncidencia.empleado.apellido}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium">Tipo:</span>
                  <p className="text-sm">{obtenerTextoTipo(selectedIncidencia.tipo)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Fecha:</span>
                  <p className="text-sm">
                    {new Date(selectedIncidencia.fecha_incidencia).toLocaleDateString('es-AR')}
                  </p>
                </div>
                {selectedIncidencia.hora_propuesta && (
                  <div>
                    <span className="text-sm font-medium">Hora propuesta:</span>
                    <p className="text-sm">{selectedIncidencia.hora_propuesta}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium">Descripción:</span>
                  <p className="text-sm mt-1">{selectedIncidencia.descripcion}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Comentarios (opcional)</label>
                <Textarea
                  placeholder="Agregue comentarios sobre su decisión..."
                  value={comentarioAprobacion}
                  onChange={(e) => setComentarioAprobacion(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={aprobarIncidencia}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Aprobar
                </Button>
                <Button
                  onClick={rechazarIncidencia}
                  variant="destructive"
                  className="flex-1"
                >
                  <XIcon className="h-4 w-4 mr-2" />
                  Rechazar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
