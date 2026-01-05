import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { 
  Search, 
  Delete, 
  User,
  Lock,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  KeyRound
} from "lucide-react"

interface EmpleadoBusqueda {
  id: string
  nombre: string
  apellido: string
  legajo: string | null
  tiene_pin: boolean
  avatar_url: string | null
  rol?: string
}

interface PinLoginAuthProps {
  onSuccess: () => void
}

type Step = 'search' | 'pin'

export default function PinLoginAuth({ onSuccess }: PinLoginAuthProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('search')
  const [busqueda, setBusqueda] = useState('')
  const [empleados, setEmpleados] = useState<EmpleadoBusqueda[]>([])
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<EmpleadoBusqueda | null>(null)
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [intentosRestantes, setIntentosRestantes] = useState<number | null>(null)

  // Search employees (exclude admin_rrhh)
  const buscarEmpleados = useCallback(async (query: string) => {
    if (query.length < 2) {
      setEmpleados([])
      return
    }
    
    try {
      const { data, error } = await supabase.rpc('kiosk_buscar_empleado', {
        p_termino: query
      })
      
      if (error) throw error
      
      // Filter out admin_rrhh - they must use email/password login
      const empleadosNoAdmin = (data || []).filter((emp: any) => emp.rol !== 'admin_rrhh')
      setEmpleados(empleadosNoAdmin)
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

  // Select employee
  const handleSelectEmpleado = (empleado: EmpleadoBusqueda) => {
    if (!empleado.tiene_pin) {
      toast({
        title: "Sin PIN configurado",
        description: "Este empleado no tiene PIN. Contacte a RRHH.",
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

  // Add digit to PIN
  const handlePinDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit)
      setError(null)
    }
  }

  // Delete last digit
  const handlePinDelete = () => {
    setPin(prev => prev.slice(0, -1))
    setError(null)
  }

  // Verify PIN and login
  const handleVerificarPin = async () => {
    if (!empleadoSeleccionado || pin.length < 4) return
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('[PinLoginAuth] Llamando a pin-first-login...')
      
      const { data, error: funcError } = await supabase.functions.invoke('pin-first-login', {
        body: {
          empleado_id: empleadoSeleccionado.id,
          pin: pin
        }
      })

      if (funcError) {
        console.error('[PinLoginAuth] Error en función:', funcError)
        throw new Error(funcError.message || 'Error al verificar PIN')
      }

      if (!data?.success) {
        console.error('[PinLoginAuth] Respuesta sin éxito:', data)
        setError(data?.error || 'PIN incorrecto')
        setIntentosRestantes(data?.intentos_restantes ?? null)
        setPin('')
        return
      }

      console.log('[PinLoginAuth] PIN verificado, iniciando sesión con OTP...')

      // Verify OTP to create session
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: data.email,
        token: data.email_otp,
        type: 'email'
      })

      if (verifyError || !verifyData?.session) {
        console.error('[PinLoginAuth] Error verificando OTP:', verifyError)
        throw new Error('Error al iniciar sesión')
      }

      const isFirstLogin = data.is_first_login

      toast({
        title: isFirstLogin ? "¡Bienvenido!" : "Sesión iniciada",
        description: isFirstLogin 
          ? `Hola ${data.empleado.nombre}, deberás establecer tu contraseña.`
          : `Bienvenido ${data.empleado.nombre} ${data.empleado.apellido}`,
      })

      onSuccess()

    } catch (err: any) {
      console.error('[PinLoginAuth] Error:', err)
      setError(err.message || 'Error al verificar PIN')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  // Auto-verify when PIN is complete
  useEffect(() => {
    if (pin.length === 4 && !loading && empleadoSeleccionado) {
      handleVerificarPin()
    }
  }, [pin])

  // Go back
  const handleBack = () => {
    setEmpleadoSeleccionado(null)
    setPin('')
    setError(null)
    setStep('search')
  }

  return (
    <div className="space-y-4">
      {/* STEP 1: Employee search */}
      {step === 'search' && (
        <div className="space-y-4">
          <div className="text-center text-sm text-muted-foreground mb-2">
            <KeyRound className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p>Ingresá con tu PIN de fichaje</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, legajo o DNI..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          <div className="max-h-[200px] overflow-y-auto space-y-2">
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
                <Avatar className="h-10 w-10">
                  <AvatarImage src={emp.avatar_url || undefined} />
                  <AvatarFallback>
                    {emp.nombre[0]}{emp.apellido[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">{emp.nombre} {emp.apellido}</p>
                  <p className="text-xs text-muted-foreground">
                    Legajo: {emp.legajo || 'N/A'}
                  </p>
                </div>
                {emp.tiene_pin ? (
                  <Lock className="h-4 w-4 text-green-500" />
                ) : (
                  <span className="text-xs text-destructive">Sin PIN</span>
                )}
              </button>
            ))}

            {busqueda.length >= 2 && empleados.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No se encontraron empleados</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: PIN entry */}
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
            <Avatar className="h-16 w-16 mx-auto mb-2">
              <AvatarImage src={empleadoSeleccionado.avatar_url || undefined} />
              <AvatarFallback className="text-lg">
                {empleadoSeleccionado.nombre[0]}{empleadoSeleccionado.apellido[0]}
              </AvatarFallback>
            </Avatar>
            <p className="font-medium">
              {empleadoSeleccionado.nombre} {empleadoSeleccionado.apellido}
            </p>
            <p className="text-sm text-muted-foreground">
              Ingresá tu PIN
            </p>
          </div>

          {/* PIN display */}
          <div className="flex justify-center gap-2 my-4">
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i}
                className={`w-10 h-12 border-2 rounded-lg flex items-center justify-center text-xl font-bold ${
                  pin.length > i ? 'border-primary bg-primary/10' : 'border-muted'
                }`}
              >
                {pin.length > i ? '•' : ''}
              </div>
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <div>
                <p>{error}</p>
                {intentosRestantes !== null && intentosRestantes > 0 && (
                  <p className="text-xs mt-1">
                    Intentos restantes: {intentosRestantes}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verificando...</span>
            </div>
          )}

          {/* Numeric keypad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => (
              key === '' ? (
                <div key="empty" />
              ) : key === 'del' ? (
                <Button
                  key="del"
                  variant="outline"
                  size="lg"
                  onClick={handlePinDelete}
                  disabled={loading || pin.length === 0}
                  className="h-12"
                >
                  <Delete className="h-5 w-5" />
                </Button>
              ) : (
                <Button
                  key={key}
                  variant="outline"
                  size="lg"
                  onClick={() => handlePinDigit(key)}
                  disabled={loading || pin.length >= 4}
                  className="h-12 text-lg font-semibold"
                >
                  {key}
                </Button>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
