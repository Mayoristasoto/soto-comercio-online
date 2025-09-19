import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Mail, Lock, User, Building2, Shield, CheckCircle, AlertCircle, Info } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Sucursal {
  id: string
  nombre: string
  direccion?: string
  ciudad?: string
}

interface NewUserData {
  email: string
  password: string
  confirmPassword: string
  nombre: string
  apellido: string
  rol: 'empleado' | 'gerente_sucursal' | 'admin_rrhh'
  sucursal_id: string
  dni?: string
  legajo?: string
}

interface UserCreationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserCreated?: () => void
}

const roles = [
  { value: 'empleado', label: 'Empleado', description: 'Acceso básico al sistema', icon: User },
  { value: 'gerente_sucursal', label: 'Gerente de Sucursal', description: 'Gestión de empleados de sucursal', icon: Building2 },
  { value: 'admin_rrhh', label: 'Administrador RRHH', description: 'Acceso completo al sistema', icon: Shield }
]

export default function UserCreationForm({ open, onOpenChange, onUserCreated }: UserCreationFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<NewUserData>({
    email: '',
    password: '',
    confirmPassword: '',
    nombre: '',
    apellido: '',
    rol: 'empleado',
    sucursal_id: '',
    dni: '',
    legajo: ''
  })

  useEffect(() => {
    if (open) {
      loadSucursales()
      resetForm()
    }
  }, [open])

  const loadSucursales = async () => {
    try {
      const { data, error } = await supabase
        .from('sucursales')
        .select('id, nombre, direccion, ciudad')
        .eq('activa', true)
        .order('nombre')

      if (error) throw error
      setSucursales(data || [])
    } catch (error) {
      console.error('Error cargando sucursales:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las sucursales",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      nombre: '',
      apellido: '',
      rol: 'empleado',
      sucursal_id: '',
      dni: '',
      legajo: ''
    })
    setStep(1)
  }

  const validateStep1 = () => {
    if (!formData.nombre.trim() || !formData.apellido.trim()) {
      toast({
        title: "Campos requeridos",
        description: "El nombre y apellido son obligatorios",
        variant: "destructive"
      })
      return false
    }
    return true
  }

  const validateStep2 = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Email inválido",
        description: "Por favor ingresa un email válido",
        variant: "destructive"
      })
      return false
    }

    if (formData.password.length < 6) {
      toast({
        title: "Contraseña muy corta",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive"
      })
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Contraseñas no coinciden",
        description: "Las contraseñas ingresadas no son iguales",
        variant: "destructive"
      })
      return false
    }
    return true
  }

  const handleNext = () => {
    console.debug('[UserCreationForm] handleNext called', { step })
    if (step === 1) {
      const ok = validateStep1()
      console.debug('[UserCreationForm] validateStep1', { ok })
      if (ok) setStep(2)
    } else if (step === 2) {
      const ok = validateStep2()
      console.debug('[UserCreationForm] validateStep2', { ok, email: formData.email })
      if (ok) setStep(3)
    }
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) return

    setLoading(true)

    try {
      // Verificar si el email ya existe
      const { data: existingUser } = await supabase
        .from('empleados')
        .select('email')
        .eq('email', formData.email)
        .single()

      if (existingUser) {
        toast({
          title: "Email ya registrado",
          description: "Ya existe un usuario con este email",
          variant: "destructive"
        })
        setLoading(false)
        return
      }

      // Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/reconoce/home`,
          data: {
            nombre: formData.nombre,
            apellido: formData.apellido,
            rol: formData.rol
          }
        }
      })

      if (authError) {
        throw authError
      }

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario en autenticación')
      }

      // Crear empleado en la base de datos
      const empleadoData = {
        user_id: authData.user.id,
        email: formData.email,
        nombre: formData.nombre,
        apellido: formData.apellido,
        rol: formData.rol,
        sucursal_id: formData.sucursal_id || null,
        dni: formData.dni || null,
        legajo: formData.legajo || null,
        activo: true,
        fecha_ingreso: new Date().toISOString().split('T')[0]
      }

      const { error: empleadoError } = await supabase
        .from('empleados')
        .insert(empleadoData)

      if (empleadoError) {
        console.error('Error creando empleado:', empleadoError)
        // Intentar eliminar el usuario de auth si falló la creación del empleado
        await supabase.auth.admin.deleteUser(authData.user.id)
        throw new Error('Error al crear el perfil del empleado')
      }

      toast({
        title: "Usuario creado exitosamente",
        description: `${formData.nombre} ${formData.apellido} ha sido registrado en el sistema`,
      })

      onOpenChange(false)
      onUserCreated?.()

    } catch (error: any) {
      console.error('Error completo:', error)
      toast({
        title: "Error al crear usuario",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getRoleIcon = (role: string) => {
    const roleConfig = roles.find(r => r.value === role)
    return roleConfig?.icon || User
  }

  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      admin_rrhh: { variant: "destructive", label: "Admin RRHH" },
      gerente_sucursal: { variant: "default", label: "Gerente" },
      empleado: { variant: "secondary", label: "Empleado" }
    }
    const config = variants[role] || { variant: "secondary", label: role }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const selectedSucursal = sucursales.find(s => s.id === formData.sucursal_id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Crear Nuevo Usuario</span>
          </DialogTitle>
          <DialogDescription>
            Paso {step} de 3: {step === 1 ? 'Información Personal' : step === 2 ? 'Credenciales de Acceso' : 'Asignación de Rol y Sucursal'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  i === step ? 'bg-primary text-primary-foreground' : 
                  i < step ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {i < step ? <CheckCircle className="h-4 w-4" /> : i}
                </div>
                {i < 3 && <div className={`w-12 h-1 ${i < step ? 'bg-green-500' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Personal Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Ingresa el nombre"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido *</Label>
                  <Input
                    id="apellido"
                    value={formData.apellido}
                    onChange={(e) => setFormData(prev => ({ ...prev, apellido: e.target.value }))}
                    placeholder="Ingresa el apellido"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dni">DNI (opcional)</Label>
                  <Input
                    id="dni"
                    value={formData.dni}
                    onChange={(e) => setFormData(prev => ({ ...prev, dni: e.target.value }))}
                    placeholder="12345678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legajo">Legajo (opcional)</Label>
                  <Input
                    id="legajo"
                    value={formData.legajo}
                    onChange={(e) => setFormData(prev => ({ ...prev, legajo: e.target.value }))}
                    placeholder="LEG001"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Credentials */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="usuario@empresa.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Repite la contraseña"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Información sobre credenciales:</p>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      <li>El email será utilizado para iniciar sesión</li>
                      <li>La contraseña debe tener al menos 6 caracteres</li>
                      <li>Se enviará un email de confirmación al usuario</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Role and Branch Assignment */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Selecciona el Rol *</Label>
                <div className="grid grid-cols-1 gap-3">
                  {roles.map((role) => {
                    const Icon = role.icon
                    return (
                      <div
                        key={role.value}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          formData.rol === role.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, rol: role.value as any }))}
                      >
                        <div className="flex items-start space-x-3">
                          <Icon className="h-5 w-5 mt-0.5 text-primary" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{role.label}</span>
                              {formData.rol === role.value && (
                                <CheckCircle className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {role.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sucursal">Sucursal</Label>
                <Select value={formData.sucursal_id} onValueChange={(value) => setFormData(prev => ({ ...prev, sucursal_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sucursal (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                    {sucursales.map((sucursal) => (
                      <SelectItem key={sucursal.id} value={sucursal.id}>
                        {sucursal.nombre}
                        {sucursal.ciudad && ` - ${sucursal.ciudad}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumen del Usuario</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Nombre completo:</span>
                    <span className="font-medium">{formData.nombre} {formData.apellido}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <span className="font-medium">{formData.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Rol:</span>
                    {getRoleBadge(formData.rol)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Sucursal:</span>
                    <span className="font-medium">{selectedSucursal?.nombre || 'Sin asignar'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={step === 1 ? () => onOpenChange(false) : handleBack}
            >
              {step === 1 ? 'Cancelar' : 'Atrás'}
            </Button>
            
            {step < 3 ? (
              <Button type="button" onClick={handleNext}>
                Siguiente
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Creando...' : 'Crear Usuario'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}