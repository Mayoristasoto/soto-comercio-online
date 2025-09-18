import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, Building2, Award } from "lucide-react"
import FacialRecognitionAuth from "@/components/FacialRecognitionAuth"

export default function SotoAuth() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Form states
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      navigate('/reconoce/home')
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión exitosamente"
      })
      
      navigate('/reconoce/home')
    } catch (error: any) {
      console.error('Error iniciando sesión:', error)
      toast({
        title: "Error de autenticación",
        description: error.message === "Invalid login credentials" 
          ? "Email o contraseña incorrectos" 
          : error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || !nombre || !apellido) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive"
      })
      return
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/reconoce/home`,
          data: {
            nombre,
            apellido,
            face_descriptor: faceDescriptor ? Array.from(faceDescriptor) : null
          }
        }
      })

      if (error) throw error

      toast({
        title: "¡Registro exitoso!",
        description: "Se ha creado tu cuenta. Ya puedes iniciar sesión.",
      })
    } catch (error: any) {
      console.error('Error registrando usuario:', error)
      toast({
        title: "Error en el registro",
        description: error.message === "User already registered" 
          ? "Este email ya está registrado" 
          : error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFacialRegister = (descriptor: Float32Array) => {
    setFaceDescriptor(descriptor)
  }

  const handleFacialLogin = async () => {
    // In a real implementation, this would compare the captured face
    // with stored descriptors from the database
    toast({
      title: "¡Acceso autorizado!",
      description: "Rostro reconocido exitosamente"
    })
    navigate('/reconoce/home')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Building2 className="h-8 w-8 text-primary" />
            <Award className="h-8 w-8 text-secondary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Soto Reconoce</h1>
            <p className="text-muted-foreground mt-2">
              Plataforma de incentivos y reconocimientos
            </p>
          </div>
        </div>

        {/* Auth Tabs */}
        <Card>
          <Tabs defaultValue="signin" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup">Registrarse</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Sign In Tab */}
              <TabsContent value="signin" className="space-y-4">
                <div className="space-y-2">
                  <CardTitle className="text-xl">Bienvenido de vuelta</CardTitle>
                  <CardDescription>
                    Ingresa con tu email y contraseña o usa reconocimiento facial
                  </CardDescription>
                </div>

                <Tabs defaultValue="email-login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="email-login">Email</TabsTrigger>
                    <TabsTrigger value="facial-login">Reconocimiento</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="email-login" className="mt-4">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email</Label>
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="tu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Contraseña</Label>
                        <div className="relative">
                          <Input
                            id="signin-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                      </Button>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="facial-login" className="mt-4">
                    <FacialRecognitionAuth
                      mode="login"
                      onRegisterSuccess={handleFacialRegister}
                      onLoginSuccess={handleFacialLogin}
                    />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* Sign Up Tab */}
              <TabsContent value="signup" className="space-y-4">
                <div className="space-y-2">
                  <CardTitle className="text-xl">Crear cuenta nueva</CardTitle>
                  <CardDescription>
                    Completa los datos para registrarte y opcionalmente agrega tu foto para reconocimiento facial
                  </CardDescription>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-nombre">Nombre</Label>
                      <Input
                        id="signup-nombre"
                        type="text"
                        placeholder="Juan"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-apellido">Apellido</Label>
                      <Input
                        id="signup-apellido"
                        type="text"
                        placeholder="Pérez"
                        value={apellido}
                        onChange={(e) => setApellido(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Facial Recognition Registration */}
                  <div className="space-y-2">
                    <Label>Reconocimiento Facial (Opcional)</Label>
                    <Card className="p-4">
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Registra tu rostro para poder iniciar sesión usando reconocimiento facial
                        </p>
                        <FacialRecognitionAuth
                          mode="register"
                          onRegisterSuccess={handleFacialRegister}
                          onLoginSuccess={handleFacialLogin}
                        />
                        {faceDescriptor && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <Award className="h-4 w-4 text-green-600" />
                              <span className="text-green-800 text-sm font-medium">
                                ✓ Rostro registrado exitosamente
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creando cuenta..." : "Crear Cuenta"}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Demo info */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              💡 <strong>Tip:</strong> Los empleados registrados serán asignados automáticamente 
              como rol "empleado". Los administradores deben ser configurados manualmente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}