import { useEffect, useState } from 'react'
import { Bell, Printer, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/integrations/supabase/client'

interface NovedadItem {
  id: string
  titulo: string
  contenido: string
  imprimible: boolean
}

interface NovedadesCheckInAlertProps {
  empleadoId: string
  empleadoNombre: string
  novedades: NovedadItem[]
  onDismiss: () => void
  duracionSegundos?: number
}

export function NovedadesCheckInAlert({
  empleadoId,
  empleadoNombre,
  novedades,
  onDismiss,
  duracionSegundos = 5,
}: NovedadesCheckInAlertProps) {
  const [confirmed, setConfirmed] = useState(false)
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    // Mark all as viewed
    const markViewed = async () => {
      for (const n of novedades) {
        try {
          await (supabase.rpc as any)('kiosk_marcar_novedad_vista', {
            p_novedad_id: n.id,
            p_empleado_id: empleadoId,
          })
        } catch (e) {
          console.error('Error marking novedad as viewed:', e)
        }
      }
    }
    markViewed()
  }, [empleadoId, novedades])

  // After confirmation, auto-dismiss after short countdown
  useEffect(() => {
    if (!confirmed) return
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          onDismiss()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [confirmed, onDismiss])

  const handlePrint = (novedad: NovedadItem) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
      <head><title>${novedad.titulo}</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;max-width:350px}h1{font-size:18px;border-bottom:2px solid #000;padding-bottom:8px}p{font-size:14px;line-height:1.5}.footer{margin-top:20px;font-size:11px;color:#666;border-top:1px solid #ccc;padding-top:8px}</style>
      </head><body>
      <h1>📢 ${novedad.titulo}</h1>
      <p>${novedad.contenido.replace(/\n/g, '<br/>')}</p>
      <div class="footer">Empleado: ${empleadoNombre}<br/>Fecha: ${new Date().toLocaleDateString('es-AR')}</div>
      </body></html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-6 border-4 border-primary shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-center mb-4">
          <div className="bg-primary/20 p-4 rounded-full">
            <Bell className="w-12 h-12 text-primary animate-pulse" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-1">📢 NOVEDADES</h2>
        <p className="text-center text-muted-foreground mb-4">
          {empleadoNombre}, tenés {novedades.length} novedad{novedades.length > 1 ? 'es' : ''} pendiente{novedades.length > 1 ? 's' : ''}
        </p>

        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-3">
            {novedades.map(n => (
              <Card key={n.id} className="p-4 border-2 border-primary/30">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{n.titulo}</h3>
                    <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{n.contenido}</p>
                  </div>
                  {n.imprimible && (
                    <Button variant="outline" size="sm" onClick={() => handlePrint(n)}>
                      <Printer className="h-4 w-4 mr-1" /> Imprimir
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-center">
          {!confirmed ? (
            <Button
              size="lg"
              className="w-full max-w-xs text-lg py-6"
              onClick={() => setConfirmed(true)}
            >
              ✅ Confirmar lectura
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              ✅ Confirmado — cerrando en {countdown}s...
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
