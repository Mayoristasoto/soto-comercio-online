import { useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { KeyRound } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const URL = "https://iizwnijtgfvanhqqjeyw.supabase.co"
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpenduaWp0Z2Z2YW5ocXFqZXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4ODc1NzAsImV4cCI6MjA3MTQ2MzU3MH0.Ec7iJRVy0l2MgFHKVPi26AnRsXhFsUM7RhOOrE7eEvE"

/** Acceso oculto de prueba: solo admin_rrhh, identifica con usuario y contraseña sin reconocimiento facial. */
export default function KioscoLoginPrueba({ onIdentificado }: { onIdentificado: (id: string, data: any) => void }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [pass, setPass] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const entrar = async () => {
    setLoading(true)
    try {
      // Cliente aislado: no reemplaza la sesión del kiosco
      const c = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false, storageKey: "kiosco-prueba" } })
      const { data: auth, error } = await c.auth.signInWithPassword({ email, password: pass })
      if (error || !auth.user) throw new Error("Usuario o contraseña incorrectos")
      const { data: emp } = await c.from("empleados").select("*").eq("user_id", auth.user.id).maybeSingle()
      await c.auth.signOut()
      if (!emp) throw new Error("No se encontró el empleado")
      if (emp.rol !== "admin_rrhh") throw new Error("Solo disponible para Admin RRHH")
      setOpen(false); setPass("")
      onIdentificado(emp.id, emp)
    } catch (e: any) {
      toast({ title: "No se pudo ingresar", description: e.message, variant: "destructive" })
    } finally { setLoading(false) }
  }

  return (
    <>
      <button aria-label="Acceso de prueba" onClick={() => setOpen(true)}
        className="fixed bottom-2 left-2 z-50 p-1 opacity-10 hover:opacity-60">
        <KeyRound className="h-4 w-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Acceso de prueba</DialogTitle>
            <DialogDescription>Solo Admin RRHH. Las fichadas que hagas se registran como reales.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Contraseña" value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && entrar()} />
          <Button onClick={entrar} disabled={loading || !email || !pass}>{loading ? "Verificando..." : "Ingresar"}</Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
