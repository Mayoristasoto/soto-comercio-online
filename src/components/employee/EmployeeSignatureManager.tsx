import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileSignature, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { SignaturePad } from './SignaturePad'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface EmployeeSignatureManagerProps {
  empleadoId: string
}

export default function EmployeeSignatureManager({ empleadoId }: EmployeeSignatureManagerProps) {
  const [firmas, setFirmas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [firmaAEliminar, setFirmaAEliminar] = useState<string | null>(null)

  useEffect(() => {
    cargarFirmas()
  }, [empleadoId])

  const cargarFirmas = async () => {
    try {
      const { data, error } = await supabase
        .from('empleados_firmas')
        .select('*')
        .eq('empleado_id', empleadoId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFirmas(data || [])
    } catch (error) {
      console.error('Error cargando firmas:', error)
      toast.error('Error al cargar las firmas')
    } finally {
      setLoading(false)
    }
  }

  const establecerFirmaActiva = async (firmaId: string) => {
    try {
      // Desactivar todas las firmas del empleado
      await supabase
        .from('empleados_firmas')
        .update({ es_activa: false })
        .eq('empleado_id', empleadoId)

      // Activar la firma seleccionada
      const { error } = await supabase
        .from('empleados_firmas')
        .update({ es_activa: true })
        .eq('id', firmaId)

      if (error) throw error

      toast.success('Firma activa actualizada')
      await cargarFirmas()
    } catch (error) {
      console.error('Error estableciendo firma activa:', error)
      toast.error('Error al actualizar firma activa')
    }
  }

  const eliminarFirma = async (firmaId: string) => {
    try {
      const { error } = await supabase
        .from('empleados_firmas')
        .delete()
        .eq('id', firmaId)

      if (error) throw error

      toast.success('Firma eliminada')
      await cargarFirmas()
      setFirmaAEliminar(null)
    } catch (error) {
      console.error('Error eliminando firma:', error)
      toast.error('Error al eliminar la firma')
    }
  }

  const handleNuevaFirma = async () => {
    setShowSignaturePad(false)
    await cargarFirmas()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Mis Firmas Digitales
            </div>
            <Button onClick={() => setShowSignaturePad(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Firma
            </Button>
          </CardTitle>
          <CardDescription>
            Gestione sus firmas digitales registradas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {firmas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSignature className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay firmas registradas</p>
              <p className="text-sm">Cree su primera firma digital</p>
            </div>
          ) : (
            <div className="space-y-3">
              {firmas.map((firma) => (
                <div
                  key={firma.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    firma.es_activa ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <img
                        src={firma.firma_data}
                        alt="Firma"
                        className="max-h-16 bg-white border rounded"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Creada: {new Date(firma.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {firma.es_activa ? (
                        <span className="text-xs font-medium text-primary">
                          Firma Activa
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => establecerFirmaActiva(firma.id)}
                        >
                          Usar esta firma
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFirmaAEliminar(firma.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showSignaturePad} onOpenChange={setShowSignaturePad}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crear Nueva Firma</DialogTitle>
          </DialogHeader>
          <SignaturePad
            onSave={async (firmaData) => {
              try {
                const { error } = await supabase
                  .from('empleados_firmas')
                  .insert({
                    empleado_id: empleadoId,
                    firma_data: firmaData,
                    es_activa: false,
                  })

                if (error) throw error

                toast.success('Firma guardada correctamente')
                setShowSignaturePad(false)
                await cargarFirmas()
              } catch (error: any) {
                console.error('Error guardando firma:', error)
                toast.error(error.message || 'No se pudo guardar la firma')
              }
            }}
            onCancel={() => setShowSignaturePad(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!firmaAEliminar} onOpenChange={() => setFirmaAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar firma?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La firma será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => firmaAEliminar && eliminarFirma(firmaAEliminar)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
