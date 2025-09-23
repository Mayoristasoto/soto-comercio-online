import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { FolderOpen, Search, Users } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import DocumentManager from "./DocumentManager"

interface Empleado {
  id: string
  nombre: string
  apellido: string
  email: string
  puesto?: string
  rol: string
  activo: boolean
  avatar_url?: string
  sucursal_id: string | null
}

interface Sucursal {
  id: string
  nombre: string
}

export default function QuickEmployeeDocuments() {
  const { toast } = useToast()
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [filteredEmpleados, setFilteredEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Empleado | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const filtered = empleados.filter(empleado =>
      empleado.activo && (
        empleado.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empleado.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empleado.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (empleado.puesto && empleado.puesto.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    )
    setFilteredEmpleados(filtered)
  }, [empleados, searchTerm])

  const loadData = async () => {
    try {
      const [empleadosResult, sucursalesResult] = await Promise.all([
        supabase.from('empleados').select('*').eq('activo', true).order('nombre'),
        supabase.from('sucursales').select('id, nombre').eq('activa', true)
      ])

      if (empleadosResult.error) throw empleadosResult.error
      if (sucursalesResult.error) throw sucursalesResult.error

      setEmpleados(empleadosResult.data || [])
      setSucursales(sucursalesResult.data || [])
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewDocuments = (empleado: Empleado) => {
    setSelectedEmployee(empleado)
    setDocumentsOpen(true)
  }

  const getRoleBadge = (rol: string) => {
    const variants: Record<string, any> = {
      admin_rrhh: { variant: "destructive", label: "Admin RRHH" },
      gerente_sucursal: { variant: "default", label: "Gerente" },
      empleado: { variant: "secondary", label: "Empleado" }
    }
    const config = variants[rol] || { variant: "secondary", label: rol }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return <div className="h-64 bg-muted rounded-lg animate-pulse"></div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Acceso Rápido - Documentos de Empleados</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Gestiona documentos de empleados de forma rápida
            </p>
          </div>
          <Badge variant="outline">{filteredEmpleados.length} empleados activos</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empleado por nombre, email o puesto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredEmpleados.map((empleado) => (
            <div key={empleado.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={empleado.avatar_url} />
                  <AvatarFallback>
                    {empleado.nombre?.charAt(0)}{empleado.apellido?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium truncate">
                      {empleado.nombre} {empleado.apellido}
                    </p>
                    {getRoleBadge(empleado.rol)}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {empleado.puesto || 'Sin puesto'} • {empleado.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sucursales.find(s => s.id === empleado.sucursal_id)?.nombre || "Sin sucursal"}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleViewDocuments(empleado)}
                className="flex items-center space-x-1"
              >
                <FolderOpen className="h-4 w-4" />
                <span>Documentos</span>
              </Button>
            </div>
          ))}
        </div>

        {filteredEmpleados.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No se encontraron empleados que coincidan con la búsqueda.' : 'No hay empleados activos.'}
          </div>
        )}

        {/* Document Manager Modal */}
        <Dialog open={documentsOpen} onOpenChange={setDocumentsOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gestión de Documentos</DialogTitle>
              <DialogDescription>
                Administra los documentos de {selectedEmployee?.nombre} {selectedEmployee?.apellido}
              </DialogDescription>
            </DialogHeader>
            {selectedEmployee && (
              <DocumentManager empleadoId={selectedEmployee.id} />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}