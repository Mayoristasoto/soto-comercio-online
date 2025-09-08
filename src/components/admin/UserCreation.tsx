import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Mail, User, Building2, Shield } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface NewUser {
  email: string
  password: string
  nombre: string
  apellido: string
  rol: string
  sucursal_id?: string
}

interface Sucursal {
  id: string
  nombre: string
}

export default function UserCreation() {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    rol: 'empleado'
  })

  const loadSucursales = async () => {
    const { data, error } = await supabase
      .from('sucursales')
      .select('id, nombre')
      .eq('activa', true)
      .order('nombre')

    if (error) {
      console.error('Error cargando sucursales:', error)
      return
    }

    setSucursales(data || [])
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      loadSucursales()
    } else {
      // Reset form
      setNewUser({
        email: '',
        password: '',
        nombre: '',
        apellido: '',
        rol: 'empleado'
      })
    }
  }

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.nombre || !newUser.apellido) {
      toast({
        title: "Error",
        description: "Todos los campos obligatorios deben completarse",
        variant: "destructive"
      })
      return
    }

    if (newUser.password.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            nombre: newUser.nombre,
            apellido: newUser.apellido
          }
        }
      })

      if (authError) {
        console.error('Error creando usuario auth:', authError)
        toast({
          title: "Error",
          description: authError.message === 'User already registered' 
            ? "Ya existe un usuario con este email" 
            : "Error al crear el usuario",
          variant: "destructive"
        })
        return
      }

      if (!authData.user) {
        toast({
          title: "Error",
          description: "No se pudo crear el usuario",
          variant: "destructive"
        })
        return
      }

      // 2. Crear empleado en la tabla empleados
      const { error: empleadoError } = await supabase
        .from('empleados')
        .insert({
          user_id: authData.user.id,
          email: newUser.email,
          nombre: newUser.nombre,
          apellido: newUser.apellido,
          rol: newUser.rol as 'empleado' | 'admin_rrhh' | 'gerente_sucursal' | 'lider_grupo',
          sucursal_id: newUser.sucursal_id || null,
          activo: true
        })

      if (empleadoError) {
        console.error('Error creando empleado:', empleadoError)
        toast({
          title: "Usuario creado parcialmente",
          description: "El usuario fue creado pero hay problemas con el perfil. Contacta al administrador.",
          variant: "destructive"
        })
        return
      }

      toast({
        title: "Usuario creado exitosamente",
        description: `${newUser.nombre} ${newUser.apellido} fue agregado al sistema`,
      })

      setOpen(false)
      window.location.reload() // Refrescar para mostrar el nuevo usuario

    } catch (error) {
      console.error('Error inesperado:', error)
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado al crear el usuario",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadge = (rol: string) => {
    const colors = {
      'admin_rrhh': 'bg-red-100 text-red-800',
      'gerente_sucursal': 'bg-blue-100 text-blue-800',
      'empleado': 'bg-green-100 text-green-800',
      'lider_grupo': 'bg-purple-100 text-purple-800'
    }

    const labels = {
      'admin_rrhh': 'Admin RRHH',
      'gerente_sucursal': 'Gerente',
      'empleado': 'Empleado',
      'lider_grupo': 'Líder de Grupo'
    }

    return (
      <Badge className={colors[rol as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {labels[rol as keyof typeof labels] || rol}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserPlus className="h-5 w-5" />
          <span>Crear Nuevo Usuario</span>
        </CardTitle>
        <CardDescription>
          Agrega nuevos empleados al sistema de reconocimientos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              Crear Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>
                Completa la información para crear un nuevo empleado en el sistema.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              {/* Información Personal */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">
                    <User className="h-4 w-4 inline mr-1" />
                    Nombre *
                  </Label>
                  <Input
                    id="nombre"
                    placeholder="Juan"
                    value={newUser.nombre}
                    onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido *</Label>
                  <Input
                    id="apellido"
                    placeholder="Pérez"
                    value={newUser.apellido}
                    onChange={(e) => setNewUser({ ...newUser, apellido: e.target.value })}
                  />
                </div>
              </div>

              {/* Email y Contraseña */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="juan.perez@soto.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña * (mín. 6 caracteres)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>

              {/* Rol */}
              <div className="space-y-2">
                <Label>
                  <Shield className="h-4 w-4 inline mr-1" />
                  Rol *
                </Label>
                <Select value={newUser.rol} onValueChange={(value) => setNewUser({ ...newUser, rol: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empleado">Empleado</SelectItem>
                    <SelectItem value="gerente_sucursal">Gerente de Sucursal</SelectItem>
                    <SelectItem value="admin_rrhh">Administrador RRHH</SelectItem>
                    <SelectItem value="lider_grupo">Líder de Grupo</SelectItem>
                  </SelectContent>
                </Select>
                <div className="mt-1">
                  {getRoleBadge(newUser.rol)}
                </div>
              </div>

              {/* Sucursal */}
              <div className="space-y-2">
                <Label>
                  <Building2 className="h-4 w-4 inline mr-1" />
                  Sucursal (opcional)
                </Label>
                <Select 
                  value={newUser.sucursal_id || "sin_asignar"} 
                  onValueChange={(value) => setNewUser({ ...newUser, sucursal_id: value === "sin_asignar" ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                    {sucursales.map((sucursal) => (
                      <SelectItem key={sucursal.id} value={sucursal.id}>
                        {sucursal.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateUser} disabled={loading}>
                {loading ? "Creando..." : "Crear Usuario"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick Stats */}
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Información sobre la creación de usuarios:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Los nuevos usuarios recibirán acceso al sistema inmediatamente</li>
            <li>• Se envía una confirmación por email automáticamente</li>
            <li>• Los administradores pueden modificar roles posteriormente</li>
            <li>• Las contraseñas pueden ser cambiadas por los usuarios</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}