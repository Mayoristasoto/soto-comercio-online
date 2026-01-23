import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Lock, 
  LockOpen, 
  RefreshCw, 
  Search,
  AlertTriangle,
  Check,
  X,
  Eye,
  EyeOff,
  Loader2,
  Key,
  Download,
  Shuffle,
  RotateCcw
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { exportarPinsPDF, exportarPinsBlanqueadosPDF } from "@/utils/pinsExportPDF"

interface EmpleadoPin {
  empleado_id: string
  nombre: string
  apellido: string
  legajo: string | null
  avatar_url: string | null
  tiene_pin: boolean
  intentos_fallidos: number
  bloqueado_hasta: string | null
  ultimo_uso: string | null
}

export default function PinManagement() {
  const { toast } = useToast()
  const [empleados, setEmpleados] = useState<EmpleadoPin[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [procesando, setProcesando] = useState<string | null>(null)
  const [generandoMasivo, setGenerandoMasivo] = useState(false)
  const [blanqueando, setBlanqueando] = useState(false)
  const [confirmBlanqueo, setConfirmBlanqueo] = useState(false)
  
  // Modal para configurar PIN
  const [modalOpen, setModalOpen] = useState(false)
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<EmpleadoPin | null>(null)
  const [nuevoPin, setNuevoPin] = useState('')
  const [confirmarPin, setConfirmarPin] = useState('')
  const [mostrarPin, setMostrarPin] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarEmpleados()
  }, [])

  const cargarEmpleados = async () => {
    setLoading(true)
    try {
      // Obtener empleados activos con info de PIN
      const { data: empleadosData, error: empleadosError } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, legajo, avatar_url')
        .eq('activo', true)
        .order('apellido')

      if (empleadosError) throw empleadosError

      // Obtener info de PINs
      const { data: pinsData, error: pinsError } = await supabase
        .from('empleados_pin')
        .select('empleado_id, intentos_fallidos, bloqueado_hasta, ultimo_uso, activo')

      if (pinsError) throw pinsError

      // Combinar datos
      const pinsMap = new Map(pinsData?.map(p => [p.empleado_id, p]) || [])
      
      const empleadosConPin: EmpleadoPin[] = (empleadosData || []).map(emp => {
        const pinInfo = pinsMap.get(emp.id)
        return {
          empleado_id: emp.id,
          nombre: emp.nombre,
          apellido: emp.apellido,
          legajo: emp.legajo,
          avatar_url: emp.avatar_url,
          tiene_pin: !!pinInfo?.activo,
          intentos_fallidos: pinInfo?.intentos_fallidos || 0,
          bloqueado_hasta: pinInfo?.bloqueado_hasta || null,
          ultimo_uso: pinInfo?.ultimo_uso || null
        }
      })

      setEmpleados(empleadosConPin)
    } catch (err) {
      console.error('Error cargando empleados:', err)
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Generar PIN aleatorio
  const generarPinAleatorio = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString()
    setNuevoPin(pin)
    setConfirmarPin(pin)
    setMostrarPin(true)
  }

  // Abrir modal para configurar PIN
  const abrirModalPin = (empleado: EmpleadoPin) => {
    setEmpleadoSeleccionado(empleado)
    setNuevoPin('')
    setConfirmarPin('')
    setMostrarPin(false)
    setModalOpen(true)
  }

  // Guardar PIN
  const guardarPin = async () => {
    if (!empleadoSeleccionado) return

    if (nuevoPin.length < 4 || nuevoPin.length > 6) {
      toast({
        title: "Error",
        description: "El PIN debe tener entre 4 y 6 dígitos",
        variant: "destructive"
      })
      return
    }

    if (nuevoPin !== confirmarPin) {
      toast({
        title: "Error",
        description: "Los PINs no coinciden",
        variant: "destructive"
      })
      return
    }

    if (!/^\d+$/.test(nuevoPin)) {
      toast({
        title: "Error",
        description: "El PIN debe contener solo números",
        variant: "destructive"
      })
      return
    }

    setGuardando(true)
    try {
      const { data, error } = await supabase.rpc('admin_set_empleado_pin', {
        p_empleado_id: empleadoSeleccionado.empleado_id,
        p_nuevo_pin: nuevoPin
      })

      if (error) throw error

      const result = data?.[0]
      if (!result?.success) {
        throw new Error(result?.mensaje || 'Error configurando PIN')
      }

      toast({
        title: "PIN configurado",
        description: `PIN configurado para ${empleadoSeleccionado.nombre} ${empleadoSeleccionado.apellido}`
      })

      setModalOpen(false)
      cargarEmpleados()
    } catch (err: any) {
      console.error('Error guardando PIN:', err)
      toast({
        title: "Error",
        description: err.message || "No se pudo configurar el PIN",
        variant: "destructive"
      })
    } finally {
      setGuardando(false)
    }
  }

  // Desbloquear empleado
  const desbloquearEmpleado = async (empleadoId: string) => {
    setProcesando(empleadoId)
    try {
      const { data, error } = await supabase.rpc('admin_desbloquear_pin', {
        p_empleado_id: empleadoId
      })

      if (error) throw error

      const result = data?.[0]
      if (!result?.success) {
        throw new Error(result?.mensaje || 'Error desbloqueando')
      }

      toast({
        title: "Empleado desbloqueado",
        description: "El empleado puede volver a usar su PIN"
      })

      cargarEmpleados()
    } catch (err: any) {
      console.error('Error desbloqueando:', err)
      toast({
        title: "Error",
        description: err.message || "No se pudo desbloquear",
        variant: "destructive"
      })
    } finally {
      setProcesando(null)
    }
  }

  // Generar PINs masivo para todos los empleados
  const generarPinsMasivo = async () => {
    setGenerandoMasivo(true)
    try {
      const { data, error } = await supabase.rpc('generar_pins_masivo')
      
      if (error) throw error

      if (!data || data.length === 0) {
        toast({
          title: "Sin empleados",
          description: "No hay empleados activos para generar PINs",
          variant: "destructive"
        })
        return
      }

      // Exportar a PDF
      const filename = exportarPinsPDF(data)
      
      toast({
        title: "PINs generados exitosamente",
        description: `Se generaron ${data.length} PINs y se descargó el archivo ${filename}`
      })

      // Recargar lista de empleados
      cargarEmpleados()
    } catch (err: any) {
      console.error('Error generando PINs masivo:', err)
      toast({
        title: "Error",
        description: err.message || "No se pudieron generar los PINs",
        variant: "destructive"
      })
    } finally {
      setGenerandoMasivo(false)
    }
  }

  // Blanquear PINs con últimos 4 dígitos del DNI
  const blanquearPins = async () => {
    setConfirmBlanqueo(false)
    setBlanqueando(true)
    try {
      const { data, error } = await supabase.rpc('blanquear_pins_con_dni')
      
      if (error) throw error

      if (!data || data.length === 0) {
        toast({
          title: "Sin empleados válidos",
          description: "No hay empleados con DNI cargado para blanquear PINs",
          variant: "destructive"
        })
        return
      }

      // Exportar a PDF con credenciales
      const filename = exportarPinsBlanqueadosPDF(data)
      
      toast({
        title: "PINs blanqueados exitosamente",
        description: `Se blanquearon ${data.length} PINs con los últimos 4 dígitos del DNI. Se descargó ${filename}`
      })

      // Recargar lista de empleados
      cargarEmpleados()
    } catch (err: any) {
      console.error('Error blanqueando PINs:', err)
      toast({
        title: "Error",
        description: err.message || "No se pudieron blanquear los PINs",
        variant: "destructive"
      })
    } finally {
      setBlanqueando(false)
    }
  }

  // Filtrar empleados
  const empleadosFiltrados = empleados.filter(emp => {
    const termino = busqueda.toLowerCase()
    return (
      emp.nombre.toLowerCase().includes(termino) ||
      emp.apellido.toLowerCase().includes(termino) ||
      (emp.legajo?.toLowerCase().includes(termino))
    )
  })

  const estaBloqueado = (bloqueadoHasta: string | null) => {
    if (!bloqueadoHasta) return false
    return new Date(bloqueadoHasta) > new Date()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Gestión de PINs de Empleados
          </CardTitle>
          <CardDescription>
            Configure y administre los PINs de acceso para fichaje en kiosco
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Barra de búsqueda y acciones */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empleado..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={cargarEmpleados} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button 
                onClick={() => setConfirmBlanqueo(true)} 
                disabled={blanqueando || loading}
                variant="outline"
                className="gap-2"
              >
                {blanqueando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Blanquear PINs (DNI)
              </Button>
              <Button 
                onClick={generarPinsMasivo} 
                disabled={generandoMasivo || loading}
                className="gap-2"
              >
                {generandoMasivo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Shuffle className="h-4 w-4" />
                    <Download className="h-4 w-4" />
                  </>
                )}
                Generar PINs Aleatorios
              </Button>
            </div>
          </div>

          {/* Tabla de empleados */}
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Cargando empleados...</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="text-center">Estado PIN</TableHead>
                    <TableHead className="text-center">Último Uso</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empleadosFiltrados.map((emp) => {
                    const bloqueado = estaBloqueado(emp.bloqueado_hasta)
                    
                    return (
                      <TableRow key={emp.empleado_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={emp.avatar_url || undefined} />
                              <AvatarFallback>
                                {emp.nombre[0]}{emp.apellido[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{emp.nombre} {emp.apellido}</p>
                              <p className="text-sm text-muted-foreground">
                                Legajo: {emp.legajo || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {!emp.tiene_pin ? (
                            <Badge variant="outline" className="gap-1">
                              <X className="h-3 w-3" />
                              Sin configurar
                            </Badge>
                          ) : bloqueado ? (
                            <Badge variant="destructive" className="gap-1">
                              <Lock className="h-3 w-3" />
                              Bloqueado
                            </Badge>
                          ) : emp.intentos_fallidos > 0 ? (
                            <Badge variant="secondary" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {emp.intentos_fallidos} intentos
                            </Badge>
                          ) : (
                            <Badge variant="default" className="gap-1 bg-green-600">
                              <Check className="h-3 w-3" />
                              Activo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {emp.ultimo_uso 
                            ? format(new Date(emp.ultimo_uso), "dd/MM/yyyy HH:mm", { locale: es })
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirModalPin(emp)}
                              disabled={procesando === emp.empleado_id}
                            >
                              <Key className="h-4 w-4 mr-1" />
                              {emp.tiene_pin ? 'Cambiar' : 'Configurar'}
                            </Button>
                            {bloqueado && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => desbloquearEmpleado(emp.empleado_id)}
                                disabled={procesando === emp.empleado_id}
                              >
                                {procesando === emp.empleado_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <LockOpen className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}

                  {empleadosFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No se encontraron empleados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para configurar PIN */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {empleadoSeleccionado?.tiene_pin ? 'Cambiar PIN' : 'Configurar PIN'}
            </DialogTitle>
            <DialogDescription>
              {empleadoSeleccionado && (
                <span>
                  Para {empleadoSeleccionado.nombre} {empleadoSeleccionado.apellido}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nuevo PIN (4-6 dígitos)</Label>
              <div className="relative">
                <Input
                  type={mostrarPin ? 'text' : 'password'}
                  value={nuevoPin}
                  onChange={(e) => setNuevoPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••"
                  maxLength={6}
                  className="pr-10 text-center text-xl tracking-widest"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setMostrarPin(!mostrarPin)}
                >
                  {mostrarPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Confirmar PIN</Label>
              <Input
                type={mostrarPin ? 'text' : 'password'}
                value={confirmarPin}
                onChange={(e) => setConfirmarPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••"
                maxLength={6}
                className="text-center text-xl tracking-widest"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={generarPinAleatorio}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Generar PIN aleatorio
            </Button>

            {nuevoPin && confirmarPin && nuevoPin !== confirmarPin && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Los PINs no coinciden
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button 
              onClick={guardarPin} 
              disabled={guardando || nuevoPin.length < 4 || nuevoPin !== confirmarPin}
            >
              {guardando ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Guardar PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación para blanquear PINs */}
      <AlertDialog open={confirmBlanqueo} onOpenChange={setConfirmBlanqueo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              ¿Blanquear todos los PINs?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Esta acción:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Reseteará los PINs de <strong>TODOS</strong> los empleados con DNI cargado</li>
                <li>Asignará como PIN los <strong>últimos 4 dígitos del DNI</strong></li>
                <li>Los empleados deberán <strong>cambiar su contraseña</strong> en el próximo login web</li>
                <li>Se generará un PDF con las credenciales de acceso</li>
              </ul>
              <p className="font-medium text-destructive mt-2">Esta acción no se puede deshacer.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={blanquearPins}>
              Blanquear PINs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
