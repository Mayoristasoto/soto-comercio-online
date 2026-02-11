import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { SignaturePad } from './SignaturePad'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  FileSignature, 
  ArrowLeft,
  Eye
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'

interface ForcedDocumentSigningProps {
  empleadoId: string
  onAllDocumentsSigned: () => void
}

interface DocumentoPendiente {
  asignacion_id: string
  documento_id: string
  titulo: string
  descripcion: string | null
  contenido: string | null
  url_archivo: string | null
  tipo_documento: string
  firmado: boolean
}

export const ForcedDocumentSigning = ({ empleadoId, onAllDocumentsSigned }: ForcedDocumentSigningProps) => {
  const { toast } = useToast()
  const [documentos, setDocumentos] = useState<DocumentoPendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState<DocumentoPendiente | null>(null)
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [signing, setSigning] = useState(false)
  const [firmaActiva, setFirmaActiva] = useState<{ id: string; firma_data: string } | null>(null)

  const firmados = documentos.filter(d => d.firmado).length
  const total = documentos.length
  const progressPercent = total > 0 ? (firmados / total) * 100 : 0

  const loadDocumentos = useCallback(async () => {
    try {
      // Get assigned documents
      const { data: asignaciones, error: asigError } = await supabase
        .from('asignaciones_documentos_obligatorios')
        .select('id, documento_id')
        .eq('empleado_id', empleadoId)
        .eq('activa', true)

      if (asigError) throw asigError
      if (!asignaciones || asignaciones.length === 0) {
        // No documents assigned, mark as complete
        await marcarCompleto()
        onAllDocumentsSigned()
        return
      }

      // Get document details
      const docIds = asignaciones.map(a => a.documento_id)
      const { data: docs, error: docsError } = await supabase
        .from('documentos_obligatorios')
        .select('id, titulo, descripcion, contenido, url_archivo, tipo_documento')
        .in('id', docIds)
        .eq('activo', true)

      if (docsError) throw docsError

      // Get existing signatures
      const { data: firmas, error: firmasError } = await supabase
        .from('documentos_firmas')
        .select('documento_id')
        .eq('empleado_id', empleadoId)
        .in('documento_id', docIds)

      if (firmasError) throw firmasError

      const firmasSet = new Set(firmas?.map(f => f.documento_id) || [])

      const docsPendientes: DocumentoPendiente[] = (docs || []).map(doc => {
        const asig = asignaciones.find(a => a.documento_id === doc.id)
        return {
          asignacion_id: asig?.id || '',
          documento_id: doc.id,
          titulo: doc.titulo,
          descripcion: doc.descripcion,
          contenido: doc.contenido,
          url_archivo: doc.url_archivo,
          tipo_documento: doc.tipo_documento,
          firmado: firmasSet.has(doc.id)
        }
      })

      setDocumentos(docsPendientes)

      // Check if all are already signed
      if (docsPendientes.length > 0 && docsPendientes.every(d => d.firmado)) {
        await marcarCompleto()
        onAllDocumentsSigned()
      }
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }, [empleadoId])

  const loadFirmaActiva = useCallback(async () => {
    const { data } = await supabase
      .from('empleados_firmas')
      .select('id, firma_data')
      .eq('empleado_id', empleadoId)
      .eq('es_activa', true)
      .maybeSingle()

    setFirmaActiva(data)
  }, [empleadoId])

  useEffect(() => {
    loadDocumentos()
    loadFirmaActiva()
  }, [loadDocumentos, loadFirmaActiva])

  const marcarCompleto = async () => {
    await supabase
      .from('empleados')
      .update({ debe_firmar_documentos_iniciales: false } as any)
      .eq('id', empleadoId)
  }

  const firmarConFirmaExistente = async (doc: DocumentoPendiente) => {
    if (!firmaActiva) return
    setSigning(true)
    try {
      const { error } = await supabase
        .from('documentos_firmas')
        .insert({
          documento_id: doc.documento_id,
          empleado_id: empleadoId,
          firma_id: firmaActiva.id,
          metadata: {
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            contexto: 'firma_obligatoria_inicial'
          }
        })

      if (error) throw error

      toast({ title: 'Documento firmado', description: `"${doc.titulo}" firmado correctamente` })

      // Update local state
      const updated = documentos.map(d =>
        d.documento_id === doc.documento_id ? { ...d, firmado: true } : d
      )
      setDocumentos(updated)
      setSelectedDoc(null)

      // Check if all signed
      if (updated.every(d => d.firmado)) {
        await marcarCompleto()
        toast({ title: '¡Todos los documentos firmados!', description: 'Ya puedes acceder a tu dashboard' })
        onAllDocumentsSigned()
      }
    } catch (error: any) {
      toast({ title: 'Error al firmar', description: error.message, variant: 'destructive' })
    } finally {
      setSigning(false)
    }
  }

  const crearYFirmar = async (firmaData: string) => {
    if (!selectedDoc) return
    setSigning(true)
    try {
      const { data: nuevaFirma, error: firmaError } = await supabase
        .from('empleados_firmas')
        .insert({
          empleado_id: empleadoId,
          firma_data: firmaData,
          es_activa: !firmaActiva, // Set as active if no existing signature
          metadata: {
            creada_para_documento: selectedDoc.documento_id,
            contexto: 'firma_obligatoria_inicial'
          }
        })
        .select()
        .single()

      if (firmaError) throw firmaError

      const { error: sigError } = await supabase
        .from('documentos_firmas')
        .insert({
          documento_id: selectedDoc.documento_id,
          empleado_id: empleadoId,
          firma_id: nuevaFirma.id,
          metadata: {
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            contexto: 'firma_obligatoria_inicial'
          }
        })

      if (sigError) throw sigError

      if (!firmaActiva) {
        setFirmaActiva({ id: nuevaFirma.id, firma_data: firmaData })
      }

      toast({ title: 'Documento firmado', description: `"${selectedDoc.titulo}" firmado correctamente` })
      setShowSignaturePad(false)

      const updated = documentos.map(d =>
        d.documento_id === selectedDoc.documento_id ? { ...d, firmado: true } : d
      )
      setDocumentos(updated)
      setSelectedDoc(null)

      if (updated.every(d => d.firmado)) {
        await marcarCompleto()
        toast({ title: '¡Todos los documentos firmados!', description: 'Ya puedes acceder a tu dashboard' })
        onAllDocumentsSigned()
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setSigning(false)
    }
  }

  if (loading) return null

  return (
    <Dialog open={true}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Firma de Documentos Obligatorios
          </DialogTitle>
          <DialogDescription>
            Debes firmar todos los documentos antes de continuar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{firmados} de {total} documentos firmados</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <ScrollArea className="max-h-[55vh]">
          {!selectedDoc ? (
            <div className="space-y-3 pr-2">
              {documentos.map(doc => (
                <Card 
                  key={doc.documento_id} 
                  className={`cursor-pointer transition-colors ${doc.firmado ? 'border-green-300 bg-green-50/50' : 'hover:border-primary/50'}`}
                  onClick={() => !doc.firmado && setSelectedDoc(doc)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {doc.firmado ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">{doc.titulo}</p>
                        {doc.descripcion && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{doc.descripcion}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={doc.firmado ? 'default' : 'secondary'}>
                      {doc.firmado ? 'Firmado' : 'Pendiente'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4 pr-2">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedDoc(null); setShowSignaturePad(false) }}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Volver a la lista
              </Button>

              <div>
                <h3 className="font-semibold text-lg">{selectedDoc.titulo}</h3>
                {selectedDoc.descripcion && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedDoc.descripcion}</p>
                )}
              </div>

              {/* Document content preview */}
              {selectedDoc.contenido && (
                <div className="border rounded-lg p-4 bg-muted/30 max-h-48 overflow-auto text-sm whitespace-pre-wrap">
                  {selectedDoc.contenido}
                </div>
              )}

              {selectedDoc.url_archivo && (
                <Button variant="outline" size="sm" asChild>
                  <a href={selectedDoc.url_archivo} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver documento completo
                  </a>
                </Button>
              )}

              {/* Signing section */}
              {!showSignaturePad ? (
                <Alert>
                  <FileSignature className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-3">Firma este documento para continuar</p>
                    <div className="flex flex-wrap gap-2">
                      {firmaActiva && (
                        <Button onClick={() => firmarConFirmaExistente(selectedDoc)} disabled={signing}>
                          <FileSignature className="h-4 w-4 mr-2" />
                          {signing ? 'Firmando...' : 'Firmar con mi firma'}
                        </Button>
                      )}
                      <Button variant={firmaActiva ? 'outline' : 'default'} onClick={() => setShowSignaturePad(true)}>
                        <FileSignature className="h-4 w-4 mr-2" />
                        {firmaActiva ? 'Crear nueva firma' : 'Dibujar firma'}
                      </Button>
                    </div>
                    {firmaActiva && (
                      <div className="mt-3 flex items-center gap-2">
                        <img src={firmaActiva.firma_data} alt="Tu firma" className="h-12 border rounded bg-white p-1" />
                        <span className="text-xs text-muted-foreground">Tu firma registrada</span>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <SignaturePad
                  onSave={crearYFirmar}
                  onCancel={() => setShowSignaturePad(false)}
                />
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
