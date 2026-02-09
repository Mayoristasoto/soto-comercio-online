import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Zap, Send } from "lucide-react"

interface UserInfo {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: string
  sucursal_id: string
}

interface Empleado {
  id: string
  nombre: string
  apellido: string
  legajo: string | null
}

interface Props {
  userInfo: UserInfo | null
  isAdmin: boolean
  isGerente: boolean
}

export function AnotacionRapida({ userInfo, isAdmin, isGerente }: Props) {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [empleadoId, setEmpleadoId] = useState("")
  const [texto, setTexto] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadEmpleados()
  }, [userInfo])

  const loadEmpleados = async () => {
    try {
      let query = supabase
        .from('empleados')
        .select('id, nombre, apellido, legajo')
        .eq('activo', true)
        .order('apellido')

      if (isGerente && !isAdmin && userInfo?.sucursal_id) {
        query = query.eq('sucursal_id', userInfo.sucursal_id)
      }

      const { data, error } = await query
      if (error) throw error
      setEmpleados(data || [])
    } catch (error) {
      console.error('Error cargando empleados:', error)
    }
  }

  const handleGuardar = async () => {
    const textoTrimmed = texto.trim()
    if (!empleadoId || !textoTrimmed) {
      toast({ title: "Completá empleado y texto", variant: "destructive" })
      return
    }
    if (textoTrimmed.length > 200) {
      toast({ title: "Máximo 200 caracteres", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('empleados_anotaciones').insert({
        empleado_id: empleadoId,
        titulo: textoTrimmed,
        categoria: 'otro',
        creado_por: userInfo?.id,
        requiere_seguimiento: false,
        es_critica: false,
      })

      if (error) throw error

      toast({ title: "Anotación guardada ✓" })
      setTexto("")
    } catch (error) {
      console.error('Error guardando anotación:', error)
      toast({ title: "Error al guardar", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGuardar()
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Anotación Rápida
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={empleadoId} onValueChange={setEmpleadoId}>
            <SelectTrigger className="sm:w-[40%]">
              <SelectValue placeholder="Seleccionar empleado" />
            </SelectTrigger>
            <SelectContent>
              {empleados.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.apellido}, {emp.nombre} {emp.legajo ? `(${emp.legajo})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            className="sm:flex-1"
            placeholder='Ej: "se fue 10 min antes", "preguntarle sobre cliente"'
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={200}
            disabled={loading}
          />

          <Button
            size="icon"
            onClick={handleGuardar}
            disabled={loading || !empleadoId || !texto.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
