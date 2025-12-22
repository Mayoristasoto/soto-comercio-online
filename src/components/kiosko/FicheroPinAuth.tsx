import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { 
  Search, 
  Delete, 
  Check, 
  X, 
  Camera, 
  User,
  Lock,
  AlertTriangle,
  Loader2,
  ArrowLeft
} from "lucide-react"
import { guardarFotoVerificacion, capturarImagenCanvas } from "@/lib/verificacionFotosService"

interface EmpleadoBusqueda {
  id: string
  nombre: string
  apellido: string
  legajo: string | null
  tiene_pin: boolean
  avatar_url: string | null
}

interface FicheroPinAuthProps {
  onSuccess: (empleadoId: string, empleadoData: any, fichajeId: string, tipoFichaje: string) => void
  onCancel: () => void
}

type Step = 'search' | 'pin' | 'photo' | 'processing'

export default function FicheroPinAuth({ onSuccess, onCancel }: FicheroPinAuthProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('search')
  const [busqueda, setBusqueda] = useState('')
  const [empleados, setEmpleados] = useState<EmpleadoBusqueda[]>([])
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<EmpleadoBusqueda | null>(null)
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [intentosRestantes, setIntentosRestantes] = useState<number | null>(null)
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(null)

  // Buscar empleados
  const buscarEmpleados = useCallback(async (query: string) => {
    if (query.length < 2) {
      setEmpleados([])
      return
    }
    
    try {
      const { data, error } = await supabase.rpc('kiosk_buscar_empleado', {
        p_busqueda: query
      })
      
      if (error) throw error
      setEmpleados(data || [])
    } catch (err) {
      console.error('Error buscando empleados:', err)
      setEmpleados([])
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      buscarEmpleados(busqueda)
    }, 300)
    return () => clearTimeout(timeout)
  }, [busqueda, buscarEmpleados])

  // Iniciar cámara
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraReady(true)
      }
    } catch (err) {
      console.error('Error iniciando cámara:', err)
      toast({
        title: "Error de cámara",
        description: "No se pudo acceder a la cámara",
        variant: "destructive"
      })
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
      setCameraReady(false)
    }
  }

  useEffect(() => {
    if (step === 'photo') {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [step])

  // Seleccionar empleado
  const handleSelectEmpleado = (empleado: EmpleadoBusqueda) => {
    if (!empleado.tiene_pin) {
      toast({
        title: "Sin PIN configurado",
        description: "Este empleado no tiene PIN configurado. Contacte a RRHH.",
        variant: "destructive"
      })
      return
    }
    setEmpleadoSeleccionado(empleado)
    setPin('')
    setError(null)
    setIntentosRestantes(null)
    setStep('pin')
  }

  // Agregar dígito al PIN
  const handlePinDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit)
      setError(null)
    }
  }

  // Borrar último dígito
  const handlePinDelete = () => {
    setPin(prev => prev.slice(0, -1))
    setError(null)
  }

  // Verificar PIN
  const handleVerificarPin = async () => {
    if (!empleadoSeleccionado || pin.length < 4) return
    
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.rpc('kiosk_verificar_pin', {
        p_empleado_id: empleadoSeleccionado.id,
        p_pin: pin
      })
      
      if (error) throw error
      
      const result = data?.[0]
      if (!result) throw new Error('Respuesta inválida del servidor')
      
      if (result.valido) {
        // PIN correcto, ir a captura de foto
        setStep('photo')
        setFotoCapturada(null)
      } else {
        setError(result.mensaje)
        setIntentosRestantes(result.intentos_restantes)
        setPin('')
      }
    } catch (err: any) {
      console.error('Error verificando PIN:', err)
      setError(err.message || 'Error verificando PIN')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  // Capturar foto
  const handleCapturarFoto = () => {
    if (!videoRef.current) return
    const foto = capturarImagenCanvas(videoRef.current)
    if (foto) {
      setFotoCapturada(foto)
    }
  }

  // Confirmar fichaje con foto
  const handleConfirmarFichaje = async () => {
    if (!empleadoSeleccionado || !fotoCapturada) return
    
    setStep('processing')
    setLoading(true)
    
    try {
      // Obtener ubicación
      let ubicacion = { latitud: null as number | null, longitud: null as number | null }
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        })
        ubicacion = {
          latitud: position.coords.latitude,
          longitud: position.coords.longitude
        }
      } catch {
        console.log('No se pudo obtener ubicación')
      }

      // Llamar RPC para fichaje con PIN
      const { data, error } = await supabase.rpc('kiosk_fichaje_pin', {
        p_empleado_id: empleadoSeleccionado.id,
        p_pin: pin,
        p_tipo: null, // Auto-determinar
        p_lat: ubicacion.latitud,
        p_lng: ubicacion.longitud,
        p_foto_base64: fotoCapturada,
        p_datos: {
          dispositivo: 'kiosco_pin',
          timestamp_local: new Date().toISOString()
        }
      })

      if (error) throw error

      const result = data?.[0]
      if (!result) throw new Error('Respuesta inválida')

      if (!result.success) {
        throw new Error(result.mensaje)
      }

      // Guardar foto en storage
      await guardarFotoVerificacion({
        empleadoId: empleadoSeleccionado.id,
        fichajeId: result.fichaje_id,
        fotoBase64: fotoCapturada,
        latitud: ubicacion.latitud ?? undefined,
        longitud: ubicacion.longitud ?? undefined,
        metodoFichaje: 'pin',
        confianzaFacial: 0
      })

      // Notificar éxito
      onSuccess(
        empleadoSeleccionado.id,
        {
          nombre: empleadoSeleccionado.nombre,
          apellido: empleadoSeleccionado.apellido
        },
        result.fichaje_id,
        result.tipo_fichaje
      )

    } catch (err: any) {
      console.error('Error procesando fichaje:', err)
      toast({
        title: "Error",
        description: err.message || "No se pudo procesar el fichaje",
        variant: "destructive"
      })
      setStep('photo')
    } finally {
      setLoading(false)
    }
  }

  // Retomar foto
  const handleRetomar = () => {
    setFotoCapturada(null)
  }

  // Volver atrás
  const handleBack = () => {
    if (step === 'pin') {
      setEmpleadoSeleccionado(null)
      setPin('')
      setStep('search')
    } else if (step === 'photo') {
      setFotoCapturada(null)
      setStep('pin')
    }
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center pb-2">
        <CardTitle className="flex items-center justify-center gap-2">
          <Lock className="h-6 w-6" />
          Fichaje con PIN
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* PASO 1: Búsqueda de empleado */}
        {step === 'search' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, legajo o DNI..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 text-lg h-12"
                autoFocus
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {empleados.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => handleSelectEmpleado(emp)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    emp.tiene_pin 
                      ? 'hover:bg-accent cursor-pointer' 
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                  disabled={!emp.tiene_pin}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={emp.avatar_url || undefined} />
                    <AvatarFallback>
                      {emp.nombre[0]}{emp.apellido[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{emp.nombre} {emp.apellido}</p>
                    <p className="text-sm text-muted-foreground">
                      Legajo: {emp.legajo || 'N/A'}
                    </p>
                  </div>
                  {emp.tiene_pin ? (
                    <Lock className="h-5 w-5 text-green-500" />
                  ) : (
                    <span className="text-xs text-destructive">Sin PIN</span>
                  )}
                </button>
              ))}

              {busqueda.length >= 2 && empleados.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No se encontraron empleados</p>
                </div>
              )}
            </div>

            <Button variant="outline" onClick={onCancel} className="w-full">
              Cancelar
            </Button>
          </div>
        )}

        {/* PASO 2: Ingreso de PIN */}
        {step === 'pin' && empleadoSeleccionado && (
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>

            <div className="text-center">
              <Avatar className="h-20 w-20 mx-auto mb-2">
                <AvatarImage src={empleadoSeleccionado.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {empleadoSeleccionado.nombre[0]}{empleadoSeleccionado.apellido[0]}
                </AvatarFallback>
              </Avatar>
              <p className="font-semibold text-lg">
                {empleadoSeleccionado.nombre} {empleadoSeleccionado.apellido}
              </p>
            </div>

            {/* Display PIN */}
            <div className="flex justify-center gap-2 my-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`w-12 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold ${
                    i < pin.length 
                      ? 'border-primary bg-primary/10' 
                      : 'border-muted'
                  }`}
                >
                  {i < pin.length ? '•' : ''}
                </div>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
                {intentosRestantes !== null && intentosRestantes > 0 && (
                  <span className="ml-auto font-medium">
                    ({intentosRestantes} intentos restantes)
                  </span>
                )}
              </div>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, i) => (
                <div key={i}>
                  {key === '' ? (
                    <div />
                  ) : key === 'del' ? (
                    <Button
                      variant="outline"
                      className="w-full h-14 text-xl"
                      onClick={handlePinDelete}
                      disabled={pin.length === 0 || loading}
                    >
                      <Delete className="h-6 w-6" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-14 text-2xl font-semibold"
                      onClick={() => handlePinDigit(key)}
                      disabled={pin.length >= 6 || loading}
                    >
                      {key}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={onCancel}
                className="flex-1"
                disabled={loading}
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button
                onClick={handleVerificarPin}
                disabled={pin.length < 4 || loading}
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Verificar
              </Button>
            </div>
          </div>
        )}

        {/* PASO 3: Captura de foto */}
        {step === 'photo' && (
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>

            <div className="text-center mb-4">
              <Camera className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">
                Tome una foto para verificar su identidad
              </p>
            </div>

            <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
              {!fotoCapturada ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <img 
                  src={fotoCapturada} 
                  alt="Foto capturada" 
                  className="w-full h-full object-cover"
                />
              )}

              {!cameraReady && !fotoCapturada && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
            </div>

            {!fotoCapturada ? (
              <Button
                onClick={handleCapturarFoto}
                disabled={!cameraReady}
                className="w-full h-14 text-lg"
              >
                <Camera className="h-5 w-5 mr-2" />
                Capturar Foto
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleRetomar}
                  className="flex-1"
                >
                  Retomar
                </Button>
                <Button
                  onClick={handleConfirmarFichaje}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Confirmar Fichaje
                </Button>
              </div>
            )}

            <Button variant="outline" onClick={onCancel} className="w-full">
              Cancelar
            </Button>
          </div>
        )}

        {/* PASO 4: Procesando */}
        {step === 'processing' && (
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">Procesando fichaje...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Por favor espere
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
