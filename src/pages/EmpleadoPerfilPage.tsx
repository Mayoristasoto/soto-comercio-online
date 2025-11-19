import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import EmployeeProfile from "@/components/admin/EmployeeProfile"

interface EmpleadoProfile {
  id: string
  nombre: string
  apellido: string
  email: string
  legajo?: string
  telefono?: string
  direccion?: string
  puesto?: string
  salario?: number
  fecha_nacimiento?: string
  estado_civil?: string
  emergencia_contacto_nombre?: string
  emergencia_contacto_telefono?: string
  id_centum?: string
  rol: string
  sucursal_id?: string
  activo: boolean
  fecha_ingreso: string
  avatar_url?: string
}

export default function EmpleadoPerfilPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [empleado, setEmpleado] = useState<EmpleadoProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadEmpleado()
    }
  }, [id])

  const loadEmpleado = async () => {
    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      
      setEmpleado(data)
    } catch (error) {
      console.error('Error loading employee:', error)
      toast({
        title: "Error",
        description: "No se pudo cargar el perfil del empleado",
        variant: "destructive"
      })
      navigate('/admin/empleados')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <EmployeeProfile
        empleado={empleado}
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            navigate('/admin/empleados')
          }
        }}
        onEmployeeUpdated={() => {
          loadEmpleado()
        }}
      />
    </div>
  )
}
