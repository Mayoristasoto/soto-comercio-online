import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, Lock, AlertCircle } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ForcedPasswordChangeProps {
  empleadoId: string
  empleadoEmail: string
  onPasswordChanged: () => void
}

export const ForcedPasswordChange = ({ empleadoId, empleadoEmail, onPasswordChanged }: ForcedPasswordChangeProps) => {
  const { toast } = useToast()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    
    return {
      minLength,
      hasUpperCase,
      hasNumber,
      hasSpecialChar,
      isValid: minLength && hasUpperCase && hasNumber && hasSpecialChar
    }
  }

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos",
        variant: "destructive"
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Las contraseñas no coinciden",
        description: "Por favor verifica que ambas contraseñas sean iguales",
        variant: "destructive"
      })
      return
    }

    const validation = validatePassword(newPassword)
    if (!validation.isValid) {
      toast({
        title: "Contraseña no cumple los requisitos",
        description: "La contraseña debe cumplir todos los requisitos de seguridad",
        variant: "destructive"
      })
      return
    }

    setIsUpdating(true)

    try {
      // Actualizar la contraseña del usuario
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      // Marcar que ya no necesita cambiar contraseña
      const { error: empleadoError } = await supabase
        .from('empleados')
        .update({ debe_cambiar_password: false })
        .eq('id', empleadoId)

      if (empleadoError) throw empleadoError

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido cambiada exitosamente",
      })

      onPasswordChanged()
    } catch (error: any) {
      console.error('Error al cambiar contraseña:', error)
      toast({
        title: "Error al cambiar contraseña",
        description: error.message || "Ocurrió un error al cambiar la contraseña",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const passwordValidation = validatePassword(newPassword)

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-[500px] [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Cambio de Contraseña Obligatorio
          </DialogTitle>
          <DialogDescription>
            Por seguridad, debes cambiar tu contraseña en el primer acceso
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="border-orange-500/50 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Importante:</strong> No podrás acceder al sistema hasta que cambies tu contraseña inicial.
          </AlertDescription>
        </Alert>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={empleadoEmail}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ingresa tu nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirma tu nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {newPassword && (
              <div className="space-y-2 text-xs">
                <p className="font-medium text-muted-foreground">Requisitos de contraseña:</p>
                <ul className="space-y-1">
                  <li className={passwordValidation.minLength ? "text-green-600" : "text-muted-foreground"}>
                    {passwordValidation.minLength ? "✓" : "○"} Mínimo 8 caracteres
                  </li>
                  <li className={passwordValidation.hasUpperCase ? "text-green-600" : "text-muted-foreground"}>
                    {passwordValidation.hasUpperCase ? "✓" : "○"} Al menos una letra mayúscula
                  </li>
                  <li className={passwordValidation.hasNumber ? "text-green-600" : "text-muted-foreground"}>
                    {passwordValidation.hasNumber ? "✓" : "○"} Al menos un número
                  </li>
                  <li className={passwordValidation.hasSpecialChar ? "text-green-600" : "text-muted-foreground"}>
                    {passwordValidation.hasSpecialChar ? "✓" : "○"} Al menos un carácter especial (!@#$%)
                  </li>
                </ul>
              </div>
            )}

            <Button
              onClick={handlePasswordChange}
              disabled={isUpdating || !passwordValidation.isValid || newPassword !== confirmPassword}
              className="w-full"
            >
              {isUpdating ? "Cambiando Contraseña..." : "Cambiar Contraseña"}
            </Button>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}