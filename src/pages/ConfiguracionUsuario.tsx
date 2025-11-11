import { useOutletContext } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AccessibilitySettings } from "@/components/AccessibilitySettings"
import { Settings, Bell, Shield, Palette, User } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useState } from "react"

interface UserInfo {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: string
}

export default function ConfiguracionUsuario() {
  const { userInfo } = useOutletContext<{ userInfo: UserInfo }>()
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center space-x-2">
          <Settings className="h-8 w-8 text-primary" />
          <span>Mi Configuración</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          Personaliza tu experiencia en la plataforma
        </p>
      </div>

      {/* Información del Usuario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Información Personal</span>
          </CardTitle>
          <CardDescription>
            Tu información de usuario en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Nombre</span>
            <span className="font-medium">{userInfo?.nombre} {userInfo?.apellido}</span>
          </div>
          <Separator />
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{userInfo?.email}</span>
          </div>
          <Separator />
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Rol</span>
            <span className="font-medium">
              {userInfo?.rol === 'admin_rrhh' ? 'Administrador RRHH' :
               userInfo?.rol === 'gerente_sucursal' ? 'Gerente de Sucursal' :
               userInfo?.rol === 'lider_grupo' ? 'Líder de Grupo' : 'Empleado'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Notificaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notificaciones</span>
          </CardTitle>
          <CardDescription>
            Gestiona cómo recibes las notificaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="email-notifications">Notificaciones por Email</Label>
              <p className="text-sm text-muted-foreground">
                Recibe actualizaciones importantes por correo electrónico
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="push-notifications">Notificaciones Push</Label>
              <p className="text-sm text-muted-foreground">
                Recibe notificaciones en tiempo real en tu navegador
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={pushNotifications}
              onCheckedChange={setPushNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Accesibilidad */}
      <AccessibilitySettings />

      {/* Apariencia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5" />
            <span>Apariencia</span>
          </CardTitle>
          <CardDescription>
            Personaliza el tema de la aplicación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            El tema se ajusta automáticamente según las preferencias de tu sistema. 
            Puedes cambiar entre modo claro y oscuro usando el botón en la barra lateral.
          </p>
        </CardContent>
      </Card>

      {/* Privacidad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Privacidad y Seguridad</span>
          </CardTitle>
          <CardDescription>
            Configuración de seguridad de tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Para cambiar tu contraseña o configurar opciones de seguridad adicionales, 
            contacta al administrador del sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
