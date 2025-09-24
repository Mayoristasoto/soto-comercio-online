import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  FileText, 
  Eye,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Download,
  Signature
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface DocumentoPendiente {
  id: string
  asignacion_id: string
  titulo: string
  descripcion: string
  contenido: string
  url_archivo: string
  tipo_documento: string
  fecha_asignacion: string
  fecha_limite_lectura: string
  confirmado: boolean
}

interface DocumentCardProps {
  empleadoId: string
  onUpdate: () => void
}

export function DocumentCard({ empleadoId, onUpdate }: DocumentCardProps) {
  const { toast } = useToast()
  const [documentos, setDocumentos] = useState<DocumentoPendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [documentoActual, setDocumentoActual] = useState<DocumentoPendiente | null>(null)
  const [firmando, setFirmando] = useState(false)

  useEffect(() => {
    loadDocumentos()
  }, [empleadoId])

  const loadDocumentos = async () => {
    try {
      const { data, error } = await supabase
        .from('asignaciones_documentos_obligatorios')
        .select(`
          id,
          fecha_asignacion,
          fecha_limite_lectura,
          documento:documentos_obligatorios(
            id,
            titulo,
            descripcion,
            contenido,
            url_archivo,
            tipo_documento
          ),
          confirmaciones_lectura!left(id)
        `)
        .eq('empleado_id', empleadoId)
        .eq('activa', true)
        .order('fecha_asignacion', { ascending: false })

      if (error) throw error

      const documentosData = data?.map(item => ({
        id: item.documento.id,
        asignacion_id: item.id,
        titulo: item.documento.titulo,
        descripcion: item.documento.descripcion,
        contenido: item.documento.contenido,
        url_archivo: item.documento.url_archivo,
        tipo_documento: item.documento.tipo_documento,
        fecha_asignacion: item.fecha_asignacion,
        fecha_limite_lectura: item.fecha_limite_lectura,
        confirmado: item.confirmaciones_lectura && item.confirmaciones_lectura.length > 0
      })) || []

      setDocumentos(documentosData)
    } catch (error) {
      console.error('Error cargando documentos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los documentos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const confirmarLectura = async (asignacionId: string, documentoId: string) => {
    setFirmando(true)
    try {
      // Obtener IP del cliente
      const ipResponse = await fetch('https://api.ipify.org?format=json')
      const ipData = await ipResponse.json()

      const { error } = await supabase
        .from('confirmaciones_lectura')
        .insert({
          asignacion_id: asignacionId,
          empleado_id: empleadoId,
          documento_id: documentoId,
          ip_confirmacion: ipData.ip
        })

      if (error) throw error

      toast({
        title: "Documento firmado digitalmente",
        description: "Tu confirmación de lectura ha sido registrada exitosamente",
      })

      setDocumentoActual(null)
      loadDocumentos()
      onUpdate()
    } catch (error) {
      console.error('Error confirmando lectura:', error)
      toast({
        title: "Error",
        description: "No se pudo confirmar la lectura del documento",
        variant: "destructive"
      })
    } finally {
      setFirmando(false)
    }
  }

  const getTipoDocumentoColor = (tipo: string) => {
    switch (tipo) {
      case 'procedimiento': return 'bg-blue-100 text-blue-800'
      case 'politica': return 'bg-purple-100 text-purple-800'
      case 'reglamento': return 'bg-red-100 text-red-800'
      case 'manual': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const esUrgente = (fechaLimite: string) => {
    if (!fechaLimite) return false
    const limite = new Date(fechaLimite)
    const hoy = new Date()
    const diasRestantes = Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
    return diasRestantes <= 3
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const documentosPendientes = documentos.filter(d => !d.confirmado)
  const documentosConfirmados = documentos.filter(d => d.confirmado)

  return (
    <>
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>Documentos Pendientes</span>
          </CardTitle>
          <CardDescription>
            Revisa y firma digitalmente los documentos asignados
          </CardDescription>
          
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Pendientes: {documentosPendientes.length}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Firmados: {documentosConfirmados.length}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {documentos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No tienes documentos pendientes</p>
              <p className="text-sm">Los nuevos documentos aparecerán aquí</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {/* Documentos pendientes primero */}
              {documentosPendientes.slice(0, 4).map((documento) => (
                <div
                  key={documento.asignacion_id}
                  className={`p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                    esUrgente(documento.fecha_limite_lectura) ? 'border-red-200 bg-red-50/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 pr-2">
                      <h4 className="font-medium text-sm flex items-center space-x-2">
                        <span>{documento.titulo}</span>
                        {esUrgente(documento.fecha_limite_lectura) && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </h4>
                      {documento.descripcion && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {documento.descripcion}
                        </p>
                      )}
                    </div>
                    <Badge className={getTipoDocumentoColor(documento.tipo_documento)}>
                      {documento.tipo_documento}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                      {documento.fecha_limite_lectura && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Límite: {format(new Date(documento.fecha_limite_lectura), 'dd MMM', { locale: es })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDocumentoActual(documento)}
                          className="text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Revisar
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                </div>
              ))}

              {/* Mostrar algunos confirmados */}
              {documentosConfirmados.slice(0, 2).map((documento) => (
                <div
                  key={documento.asignacion_id}
                  className="p-4 border rounded-lg bg-green-50/50 opacity-75"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span>{documento.titulo}</span>
                      </h4>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      <Signature className="h-3 w-3 mr-1" />
                      Firmado
                    </Badge>
                  </div>
                </div>
              ))}

              {documentos.length > 6 && (
                <div className="text-center text-sm text-muted-foreground pt-2">
                  +{documentos.length - 6} documento{documentos.length - 6 !== 1 ? 's' : ''} más
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para revisar documento */}
      {documentoActual && (
        <Dialog open={!!documentoActual} onOpenChange={() => setDocumentoActual(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>{documentoActual.titulo}</span>
              </DialogTitle>
              <DialogDescription>
                {documentoActual.descripcion}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto border rounded-lg p-6 max-h-96">
              {documentoActual.contenido ? (
                <div className="prose prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: documentoActual.contenido }} />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Contenido del documento no disponible</p>
                  {documentoActual.url_archivo && (
                    <Button variant="outline" className="mt-3">
                      <Download className="h-4 w-4 mr-2" />
                      Descargar documento
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {documentoActual.fecha_limite_lectura && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Fecha límite: {format(new Date(documentoActual.fecha_limite_lectura), 'dd MMMM yyyy', { locale: es })}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setDocumentoActual(null)}
                  disabled={firmando}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={() => confirmarLectura(documentoActual.asignacion_id, documentoActual.id)}
                  disabled={firmando}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {firmando ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Firmando...
                    </>
                  ) : (
                    <>
                      <Signature className="h-4 w-4 mr-2" />
                      Confirmar Lectura y Firmar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}