import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eraser, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

interface SignaturePadProps {
  empleadoId: string
  onSignatureSaved?: (firmaId: string) => void
  onCancel?: () => void
}

export default function SignaturePad({ empleadoId, onSignatureSaved, onCancel }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Configurar canvas
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)

    // Estilo de línea
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    setIsEmpty(false)

    const rect = canvas.getBoundingClientRect()
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
  }

  const saveSignature = async () => {
    const canvas = canvasRef.current
    if (!canvas || isEmpty) {
      toast.error('Por favor dibuje su firma primero')
      return
    }

    setSaving(true)

    try {
      // Convertir canvas a base64
      const firmaData = canvas.toDataURL('image/png')

      // Guardar en Supabase
      const { data, error } = await supabase
        .from('empleados_firmas')
        .insert({
          empleado_id: empleadoId,
          firma_data: firmaData,
          metadata: {
            timestamp: new Date().toISOString(),
            device: navigator.userAgent,
          },
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Firma guardada correctamente')
      onSignatureSaved?.(data.id)
    } catch (error) {
      console.error('Error guardando firma:', error)
      toast.error('Error al guardar la firma')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Firma Digital</span>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Dibuje su firma en el recuadro utilizando el mouse o pantalla táctil
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative border-2 border-dashed border-muted-foreground/20 rounded-lg overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            className="w-full h-64 touch-none cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <div className="absolute bottom-2 left-2 text-xs text-muted-foreground pointer-events-none">
            Firme aquí
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={clearCanvas}
            disabled={isEmpty || saving}
          >
            <Eraser className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
          <Button
            onClick={saveSignature}
            disabled={isEmpty || saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar Firma'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
