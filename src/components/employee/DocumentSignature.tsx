import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileSignature, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import SignaturePad from './SignaturePad'

interface DocumentSignatureProps {
  documentoId: string
  empleadoId: string
  documentoTitulo: string
  onSigned?: () => void
}

export default function DocumentSignature({
  documentoId,
  empleadoId,
  documentoTitulo,
  onSigned,
}: DocumentSignatureProps) {
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [firmaActual, setFirmaActual] = useState<any>(null)
  const [documentoFirmado, setDocumentoFirmado] = useState(false)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)

  useEffect(() => {
    cargarEstadoFirma()
  }, [documentoId, empleadoId])

  const cargarEstadoFirma = async () => {
    try {
      // Verificar si el documento ya está firmado
      const { data: firma, error: firmaError } = await supabase
        .from('documentos_firmas')
        .select('*, empleados_firmas(*)')
        .eq('documento_id', documentoId)
        .eq('empleado_id', empleadoId)
        .maybeSingle()

      if (firmaError && firmaError.code !== 'PGRST116') throw firmaError

      setDocumentoFirmado(!!firma)

      // Cargar firma activa del empleado
      const { data: firmaEmpleado, error: firmaEmpleadoError } = await supabase
        .from('empleados_firmas')
        .select('*')
        .eq('empleado_id', empleadoId)
        .eq('es_activa', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (firmaEmpleadoError && firmaEmpleadoError.code !== 'PGRST116') {
        throw firmaEmpleadoError
      }

      setFirmaActual(firmaEmpleado)
    } catch (error) {
      console.error('Error cargando estado de firma:', error)
      toast.error('Error al cargar información de firma')
    } finally {
      setLoading(false)
    }
  }

  const firmarDocumento = async (firmaId?: string) => {
    setSigning(true)
    try {
      const firmaIdAUsar = firmaId || firmaActual?.id

      if (!firmaIdAUsar) {
        toast.error('No hay firma disponible')
        return
      }

      const { error } = await supabase.from('documentos_firmas').insert({
        documento_id: documentoId,
        empleado_id: empleadoId,
        firma_id: firmaIdAUsar,
        metadata: {
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
        },
      })

      if (error) throw error

      toast.success('Documento firmado correctamente')
      setDocumentoFirmado(true)
      setShowSignaturePad(false)
      onSigned?.()
      await cargarEstadoFirma()
    } catch (error) {
      console.error('Error firmando documento:', error)
      toast.error('Error al firmar el documento')
    } finally {
      setSigning(false)
    }
  }

  const handleNuevaFirma = async (firmaId: string) => {
    await firmarDocumento(firmaId)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Firma del Documento
          </CardTitle>
          <CardDescription>
            {documentoTitulo}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {documentoFirmado ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Este documento ya ha sido firmado digitalmente
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Este documento requiere su firma digital para continuar
                </AlertDescription>
              </Alert>

              {firmaActual ? (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <p className="text-sm font-medium mb-2">Firma registrada:</p>
                    <img
                      src={firmaActual.firma_data}
                      alt="Firma actual"
                      className="max-h-24 bg-white border rounded"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => firmarDocumento()}
                      disabled={signing}
                      className="flex-1"
                    >
                      <FileSignature className="h-4 w-4 mr-2" />
                      {signing ? 'Firmando...' : 'Firmar con Firma Registrada'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowSignaturePad(true)}
                    >
                      Nueva Firma
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setShowSignaturePad(true)}
                  className="w-full"
                >
                  <FileSignature className="h-4 w-4 mr-2" />
                  Crear y Firmar Documento
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showSignaturePad} onOpenChange={setShowSignaturePad}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crear Firma Digital</DialogTitle>
          </DialogHeader>
          <SignaturePad
            empleadoId={empleadoId}
            onSignatureSaved={handleNuevaFirma}
            onCancel={() => setShowSignaturePad(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
