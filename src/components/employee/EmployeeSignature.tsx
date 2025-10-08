import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { SignaturePad } from './SignaturePad'
import { PenTool, Plus, Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface EmployeeSignatureProps {
  empleado: {
    id: string
    nombre: string
    apellido: string
  }
}

interface Firma {
  id: string
  firma_data: string
  es_activa: boolean
  fecha_creacion: string
}

export const EmployeeSignature = ({ empleado }: EmployeeSignatureProps) => {
  const { toast } = useToast()
  const [firmas, setFirmas] = useState<Firma[]>([])
  const [loading, setLoading] = useState(true)
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    cargarFirmas()
  }, [empleado.id])

  const cargarFirmas = async () => {
    try {
      const { data, error } = await supabase
        .from('empleados_firmas')
        .select('*')
        .eq('empleado_id', empleado.id)
        .order('fecha_creacion', { ascending: false })

      if (error) throw error
      setFirmas(data || [])
    } catch (error) {
      console.error('Error cargando firmas:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las firmas',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const guardarFirma = async (firmaData: string) => {
    setSaving(true)
    try {
      // Desactivar firmas anteriores
      if (firmas.length > 0) {
        const { error: updateError } = await supabase
          .from('empleados_firmas')
          .update({ es_activa: false })
          .eq('empleado_id', empleado.id)
          .eq('es_activa', true)

        if (updateError) throw updateError
      }

      // Guardar nueva firma
      const { error: insertError } = await supabase
        .from('empleados_firmas')
        .insert({
          empleado_id: empleado.id,
          firma_data: firmaData,
          es_activa: true,
          metadata: {
            user_agent: navigator.userAgent,
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
          },
        })

      if (insertError) throw insertError

      toast({
        title: 'Firma guardada',
        description: 'Tu firma digital ha sido registrada correctamente',
      })

      setShowSignaturePad(false)
      cargarFirmas()
    } catch (error) {
      console.error('Error guardando firma:', error)
      toast({
        title: 'Error',
        description: 'No se pudo guardar la firma',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const activarFirma = async (firmaId: string) => {
    try {
      // Desactivar todas las firmas
      await supabase
        .from('empleados_firmas')
        .update({ es_activa: false })
        .eq('empleado_id', empleado.id)

      // Activar la seleccionada
      const { error } = await supabase
        .from('empleados_firmas')
        .update({ es_activa: true })
        .eq('id', firmaId)

      if (error) throw error

      toast({
        title: 'Firma activada',
        description: 'Esta firma se usará para futuros documentos',
      })

      cargarFirmas()
    } catch (error) {
      console.error('Error activando firma:', error)
      toast({
        title: 'Error',
        description: 'No se pudo activar la firma',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />
  }

  const firmaActiva = firmas.find(f => f.es_activa)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5" />
                Mi Firma Digital
              </CardTitle>
              <CardDescription>
                Gestiona tu firma digital para documentos
              </CardDescription>
            </div>
            <Dialog open={showSignaturePad} onOpenChange={setShowSignaturePad}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Firma
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Crear Nueva Firma</DialogTitle>
                </DialogHeader>
                <SignaturePad
                  onSave={guardarFirma}
                  onCancel={() => setShowSignaturePad(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {firmaActiva ? (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-background">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Firma Actual</span>
                  <Badge variant="default" className="bg-green-600">
                    <Check className="h-3 w-3 mr-1" />
                    Activa
                  </Badge>
                </div>
                <img
                  src={firmaActiva.firma_data}
                  alt="Firma digital"
                  className="max-h-32 border rounded bg-white p-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Creada el {new Date(firmaActiva.fecha_creacion).toLocaleDateString()}
                </p>
              </div>

              {firmas.length > 1 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Firmas Anteriores</p>
                  <div className="grid gap-2">
                    {firmas
                      .filter(f => !f.es_activa)
                      .map(firma => (
                        <div
                          key={firma.id}
                          className="border rounded-lg p-3 bg-background flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={firma.firma_data}
                              alt="Firma archivada"
                              className="h-16 border rounded bg-white p-1"
                            />
                            <span className="text-xs text-muted-foreground">
                              {new Date(firma.fecha_creacion).toLocaleDateString()}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => activarFirma(firma.id)}
                          >
                            Reactivar
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <PenTool className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tienes ninguna firma registrada</p>
              <p className="text-sm">Crea tu primera firma digital</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
