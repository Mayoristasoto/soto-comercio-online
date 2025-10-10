import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { KeyRound, Eye, EyeOff } from "lucide-react"

interface PasswordChangeProps {
  employeeId: string
  employeeName: string
  employeeEmail: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function PasswordChange({ 
  employeeId, 
  employeeName, 
  employeeEmail, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange 
}: PasswordChangeProps) {
  const { toast } = useToast()
  const [internalOpen, setInternalOpen] = useState(false)
  
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange !== undefined ? externalOnOpenChange : setInternalOpen
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres"
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return "Debe contener al menos una letra minúscula"
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return "Debe contener al menos una letra mayúscula"
    }
    if (!/(?=.*\d)/.test(password)) {
      return "Debe contener al menos un número"
    }
    return null
  }

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos",
        variant: "destructive"
      })
      return
    }

    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      toast({
        title: "Contraseña inválida",
        description: passwordError,
        variant: "destructive"
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive"
      })
      return
    }

    setIsUpdating(true)

    try {
      // Call the edge function to change password using Supabase client
      const { data, error } = await supabase.functions.invoke('admin-change-password', {
        body: {
          empleadoId: employeeId,
          newPassword: newPassword
        }
      })

      if (error) {
        throw new Error(error.message || 'Error al cambiar contraseña')
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Error al cambiar contraseña')
      }

      toast({
        title: "Contraseña actualizada",
        description: `La contraseña de ${employeeName} ha sido cambiada exitosamente`,
      })

      // Limpiar formulario y cerrar modal
      setNewPassword("")
      setConfirmPassword("")
      setOpen(false)

    } catch (error: any) {
      console.error('Error cambiando contraseña:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo cambiar la contraseña",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const resetForm = () => {
    setNewPassword("")
    setConfirmPassword("")
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      setOpen(open)
      if (!open) resetForm()
    }}>
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <KeyRound className="h-4 w-4 mr-2" />
            Cambiar Contraseña
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cambiar Contraseña</DialogTitle>
          <DialogDescription>
            Actualizar la contraseña de acceso para {employeeName} ({employeeEmail})
          </DialogDescription>
        </DialogHeader>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nueva Contraseña</CardTitle>
            <CardDescription>
              La contraseña debe cumplir con los requisitos de seguridad
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ingrese la nueva contraseña"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
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
                  placeholder="Confirme la nueva contraseña"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium mb-2">Requisitos de contraseña:</p>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li className={newPassword.length >= 8 ? "text-green-600" : ""}>
                  • Mínimo 8 caracteres
                </li>
                <li className={/(?=.*[a-z])/.test(newPassword) ? "text-green-600" : ""}>
                  • Al menos una letra minúscula
                </li>
                <li className={/(?=.*[A-Z])/.test(newPassword) ? "text-green-600" : ""}>
                  • Al menos una letra mayúscula
                </li>
                <li className={/(?=.*\d)/.test(newPassword) ? "text-green-600" : ""}>
                  • Al menos un número
                </li>
              </ul>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isUpdating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePasswordChange}
                disabled={isUpdating || !newPassword || !confirmPassword}
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Actualizando...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4 mr-2" />
                    Cambiar Contraseña
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}