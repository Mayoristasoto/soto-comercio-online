import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { SignaturePad } from './SignaturePad'
import { FileSignature, CheckCircle2, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface DocumentSignatureProps {
  documentoId: string
  empleadoId: string
  onSigned?: () => void
}

interface FirmaDocumento {
  id: string
  fecha_firma: string
  firma_id: string
  empleados_firmas: {
    firma_data: string
  }
}

export const DocumentSignature = ({ documentoId, empleadoId, onSigned }: DocumentSignatureProps) => {
  const { toast } = useToast()
  const [firmado, setFirmado] = useState(false)
  const [firmaDocumento, setFirmaDocumento] = useState<FirmaDocumento | null>(null)
  const [firmaActiva, setFirmaActiva] = useState<{ id: string; firma_data: string } | null>(null)
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)

  useEffect(() => {
    verificarFirma()
    cargarFirmaActiva()
  }, [documentoId, empleadoId])

  const verificarFirma = async () => {
    try {
      const { data, error } = await supabase
        .from('documentos_firmas')
        .select(`
          id,
          fecha_firma,
          firma_id,
          empleados_firmas (
            firma_data
          )
        `)
        .eq('documento_id', documentoId)
        .eq('empleado_id', empleadoId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setFirmado(true)
        setFirmaDocumento(data as FirmaDocumento)
      }
    } catch (error) {
      console.error('Error verificando firma:', error)
    } finally {
      setLoading(false)
    }
  }

  const cargarFirmaActiva = async () => {
    try {
      const { data, error } = await supabase
        .from('empleados_firmas')
        .select('id, firma_data')
        .eq('empleado_id', empleadoId)
        .eq('es_activa', true)
        .maybeSingle()

      if (error) throw error
      setFirmaActiva(data)
    } catch (error) {
      console.error('Error cargando firma activa:', error)
    }
  }

  const firmarConFirmaExistente = async () => {
    if (!firmaActiva) return

    setSigning(true)
    try {
      const { error } = await supabase
        .from('documentos_firmas')
        .insert({
          documento_id: documentoId,
          empleado_id: empleadoId,
          firma_id: firmaActiva.id,
          metadata: {
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
        })

      if (error) throw error

      toast({
        title: 'Documento firmado',
        description: 'Tu firma ha sido registrada correctamente',
      })

      setFirmado(true)
      verificarFirma()
      onSigned?.()
    } catch (error: any) {
      console.error('Error firmando documento:', error)
      toast({
        title: 'Error al firmar',
        description: error.message || 'No se pudo registrar la firma',
        variant: 'destructive',
      })
    } finally {
      setSigning(false)
    }
  }

  const crearYFirmar = async (firmaData: string) => {
    setSigning(true)
    try {
      // Crear nueva firma
      const { data: nuevaFirma, error: firmaError } = await supabase
        .from('empleados_firmas')
        .insert({
          empleado_id: empleadoId,
          firma_data: firmaData,
          es_activa: false, // No la activamos como predeterminada
          metadata: {
            creada_para_documento: documentoId,
            user_agent: navigator.userAgent,
          },
        })
        .select()
        .single()

      if (firmaError) throw firmaError

      // Firmar documento con nueva firma
      const { error: sigError } = await supabase
        .from('documentos_firmas')
        .insert({
          documento_id: documentoId,
          empleado_id: empleadoId,
          firma_id: nuevaFirma.id,
          metadata: {
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          },
        })

      if (sigError) throw sigError

      toast({
        title: 'Documento firmado',
        description: 'Tu firma ha sido creada y registrada',
      })

      setShowSignaturePad(false)
      setFirmado(true)
      verificarFirma()
      onSigned?.()
    } catch (error: any) {
      console.error('Error al crear y firmar:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo registrar la firma',
        variant: 'destructive',
      })
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse h-24 bg-muted rounded-lg" />
  }

  if (firmado && firmaDocumento) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <p className="font-medium text-green-900">Documento firmado</p>
            <p className="text-sm text-green-700">
              Firmado el {new Date(firmaDocumento.fecha_firma).toLocaleString()}
            </p>
          </div>
          {firmaDocumento.empleados_firmas && (
            <img
              src={firmaDocumento.empleados_firmas.firma_data}
              alt="Firma registrada"
              className="h-16 border rounded bg-white p-1"
            />
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <p className="font-medium mb-2">Este documento requiere tu firma</p>
          <div className="flex gap-2">
            {firmaActiva ? (
              <Button onClick={firmarConFirmaExistente} disabled={signing}>
                <FileSignature className="h-4 w-4 mr-2" />
                {signing ? 'Firmando...' : 'Firmar con mi firma registrada'}
              </Button>
            ) : null}
            
            <Dialog open={showSignaturePad} onOpenChange={setShowSignaturePad}>
              <DialogTrigger asChild>
                <Button variant={firmaActiva ? 'outline' : 'default'}>
                  <FileSignature className="h-4 w-4 mr-2" />
                  {firmaActiva ? 'Crear nueva firma' : 'Firmar documento'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Firmar Documento</DialogTitle>
                  <DialogDescription>
                    Dibuja tu firma para firmar este documento
                  </DialogDescription>
                </DialogHeader>
                <SignaturePad
                  onSave={crearYFirmar}
                  onCancel={() => setShowSignaturePad(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </AlertDescription>
      </Alert>

      {firmaActiva && (
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-background">
          <img
            src={firmaActiva.firma_data}
            alt="Tu firma"
            className="h-16 border rounded bg-white p-1"
          />
          <div className="flex-1">
            <p className="text-sm font-medium">Tu firma registrada</p>
            <p className="text-xs text-muted-foreground">
              Puedes usar esta firma o crear una nueva
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
