import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { 
  Briefcase,
  FileText,
  Building2,
  Star,
  DollarSign,
  AlertCircle
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface PuestoInfo {
  id: string
  nombre: string
  descripcion?: string
  responsabilidades?: string
  requisitos?: string
  departamento?: string
  nivel_jerarquico: number
  salario_minimo?: number
  salario_maximo?: number
}

interface PuestoDocumento {
  id: string
  titulo: string
  descripcion?: string
  tipo_documento: string
  contenido?: string
  obligatorio: boolean
  orden: number
}

interface EmployeePuestoProps {
  empleado: {
    id: string
    nombre: string
    apellido: string
    puesto?: string
    puesto_id?: string
  }
}

export default function EmployeePuesto({ empleado }: EmployeePuestoProps) {
  const { toast } = useToast()
  const [puestoInfo, setPuestoInfo] = useState<PuestoInfo | null>(null)
  const [documentos, setDocumentos] = useState<PuestoDocumento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPuestoInfo()
  }, [empleado.id])

  const loadPuestoInfo = async () => {
    setLoading(true)
    try {
      // If employee has puesto_id, use it; otherwise try to find by puesto name
      let puestoQuery = supabase.from('puestos').select('*')
      
      if (empleado.puesto_id) {
        puestoQuery = puestoQuery.eq('id', empleado.puesto_id)
      } else if (empleado.puesto) {
        puestoQuery = puestoQuery.eq('nombre', empleado.puesto)
      } else {
        setLoading(false)
        return
      }

      const { data: puestoData, error: puestoError } = await puestoQuery
        .eq('activo', true)
        .single()

      if (puestoError) {
        if (puestoError.code !== 'PGRST116') { // Not found error
          throw puestoError
        }
        setLoading(false)
        return
      }

      setPuestoInfo(puestoData)

      // Load position documents
      const { data: docsData, error: docsError } = await supabase
        .from('puesto_documentos')
        .select('*')
        .eq('puesto_id', puestoData.id)
        .eq('activo', true)
        .order('orden', { ascending: true })

      if (docsError) throw docsError
      setDocumentos(docsData || [])

    } catch (error) {
      console.error('Error loading position info:', error)
      toast({
        title: "Error",
        description: "No se pudo cargar la información del puesto",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const formatSalary = (amount?: number) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount)
  }

  const getNivelText = (nivel: number) => {
    switch (nivel) {
      case 1: return 'Operativo'
      case 2: return 'Supervisión'
      case 3: return 'Gerencia'
      case 4: return 'Dirección'
      default: return `Nivel ${nivel}`
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-lg mb-6"></div>
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!puestoInfo) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Puesto no asignado
            </h3>
            <p className="text-sm text-muted-foreground">
              No tienes un puesto asignado o la información no está disponible
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Mi Puesto de Trabajo</h2>
        <p className="text-muted-foreground">
          Información sobre tu puesto y responsabilidades
        </p>
      </div>

      {/* Position Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Briefcase className="h-5 w-5" />
            <span>{puestoInfo.nombre}</span>
          </CardTitle>
          {puestoInfo.descripcion && (
            <CardDescription>
              {puestoInfo.descripcion}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Departamento</p>
                <p className="text-sm text-muted-foreground">
                  {puestoInfo.departamento || 'No especificado'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Nivel Jerárquico</p>
                <p className="text-sm text-muted-foreground">
                  {getNivelText(puestoInfo.nivel_jerarquico)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Rango Salarial</p>
                <p className="text-sm text-muted-foreground">
                  {puestoInfo.salario_minimo || puestoInfo.salario_maximo ? (
                    <>
                      {formatSalary(puestoInfo.salario_minimo)} - {formatSalary(puestoInfo.salario_maximo)}
                    </>
                  ) : (
                    'No definido'
                  )}
                </p>
              </div>
            </div>
          </div>

          {puestoInfo.responsabilidades && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Responsabilidades</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {puestoInfo.responsabilidades}
                </p>
              </div>
            </>
          )}

          {puestoInfo.requisitos && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Requisitos del Puesto</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {puestoInfo.requisitos}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      {documentos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Documentos del Puesto</span>
            </CardTitle>
            <CardDescription>
              Manuales, procedimientos y documentación relacionada con tu puesto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documentos.map((doc) => (
                <Card key={doc.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{doc.titulo}</h4>
                        <div className="flex space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {doc.tipo_documento}
                          </Badge>
                          {doc.obligatorio && (
                            <Badge className="bg-orange-100 text-orange-800 text-xs">
                              Obligatorio
                            </Badge>
                          )}
                        </div>
                      </div>
                      {doc.descripcion && (
                        <p className="text-sm text-muted-foreground">{doc.descripcion}</p>
                      )}
                      {doc.contenido && (
                        <div className="mt-3 p-4 bg-muted rounded-lg">
                          <p className="text-sm whitespace-pre-wrap">{doc.contenido}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {documentos.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No hay documentos específicos asociados a tu puesto
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}