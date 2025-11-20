import { useState, useEffect, useRef } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Printer, FileText } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import DOMPurify from "dompurify"

interface Empleado {
  id: string
  nombre: string
  apellido: string
  legajo: string
}

interface Plantilla {
  id: string
  nombre: string
  tipo_elemento: string
  template_html: string | null
}

interface EntregaElementosImprimirProps {
  onEntregaCreated?: () => void
}

export function EntregaElementosImprimir({ onEntregaCreated }: EntregaElementosImprimirProps) {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState("")
  const printRef = useRef<HTMLDivElement>(null)
  
  const [formData, setFormData] = useState({
    empleado_id: "",
    plantilla_id: "",
    cantidad: "1",
    talla: "",
    observaciones: ""
  })

  useEffect(() => {
    loadEmpleados()
    loadPlantillas()
  }, [])

  const loadEmpleados = async () => {
    const { data, error } = await supabase
      .from("empleados")
      .select("id, nombre, apellido, legajo")
      .eq("activo", true)
      .order("apellido")

    if (error) {
      toast.error("Error al cargar empleados")
      return
    }
    setEmpleados(data || [])
  }

  const loadPlantillas = async () => {
    const { data, error } = await supabase
      .from("plantillas_elementos")
      .select("id, nombre, tipo_elemento, template_html")
      .eq("activo", true)
      .order("nombre")

    if (error) {
      toast.error("Error al cargar plantillas")
      return
    }
    setPlantillas(data || [])
  }

  const generateHtml = () => {
    const empleado = empleados.find(e => e.id === formData.empleado_id)
    const plantilla = plantillas.find(p => p.id === formData.plantilla_id)
    
    if (!empleado || !plantilla) return ""

    const defaultTemplate = `
      <div style="padding: 40px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333;">Entrega de Elemento</h1>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p><strong>Fecha:</strong> {{fecha}}</p>
          <p><strong>Empleado:</strong> {{empleado_nombre}}</p>
          <p><strong>Legajo:</strong> {{legajo}}</p>
        </div>
        
        <div style="margin: 30px 0; padding: 20px; background: #f5f5f5; border-radius: 8px;">
          <h3 style="margin-top: 0;">Elemento Entregado:</h3>
          <p><strong>Tipo:</strong> {{tipo_elemento}}</p>
          <p><strong>Cantidad:</strong> {{cantidad}}</p>
          <p><strong>Talla:</strong> {{talla}}</p>
        </div>
        
        <div style="margin-top: 60px;">
          <p style="margin-bottom: 80px;"><strong>Observaciones:</strong> {{observaciones}}</p>
          
          <div style="display: flex; justify-content: space-between; margin-top: 80px;">
            <div style="text-align: center; flex: 1;">
              <div style="border-top: 2px solid #333; padding-top: 10px;">
                <p><strong>Firma del Empleado</strong></p>
                <p style="font-size: 12px; color: #666;">{{empleado_nombre}}</p>
              </div>
            </div>
            
            <div style="text-align: center; flex: 1;">
              <div style="border-top: 2px solid #333; padding-top: 10px;">
                <p><strong>Firma RRHH</strong></p>
                <p style="font-size: 12px; color: #666;">{{fecha}}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `

    const template = plantilla.template_html || defaultTemplate

    return template
      .replace(/{{empleado_nombre}}/g, `${empleado.nombre} ${empleado.apellido}`)
      .replace(/{{legajo}}/g, empleado.legajo || "")
      .replace(/{{fecha}}/g, new Date().toLocaleDateString('es-AR'))
      .replace(/{{cantidad}}/g, formData.cantidad)
      .replace(/{{tipo_elemento}}/g, plantilla.tipo_elemento)
      .replace(/{{talla}}/g, formData.talla || "N/A")
      .replace(/{{observaciones}}/g, formData.observaciones || "Ninguna")
  }

  const handlePreview = () => {
    if (!formData.empleado_id || !formData.plantilla_id) {
      toast.error("Seleccione empleado y plantilla")
      return
    }

    const html = generateHtml()
    setPreviewHtml(html)
    setPreviewOpen(true)
  }

  const handlePrint = async () => {
    if (!formData.empleado_id || !formData.plantilla_id) {
      toast.error("Seleccione empleado y plantilla")
      return
    }

    // Crear entrega en la base de datos
    const plantilla = plantillas.find(p => p.id === formData.plantilla_id)
    const { data: currentEmpleado } = await supabase.rpc("get_current_empleado_full")
    
    const { error } = await supabase.from("entregas_elementos").insert({
      empleado_id: formData.empleado_id,
      entregado_por: currentEmpleado[0].id,
      tipo_elemento: plantilla?.tipo_elemento || "",
      descripcion: "",
      talla: formData.talla,
      cantidad: parseInt(formData.cantidad),
      observaciones: formData.observaciones,
      plantilla_id: formData.plantilla_id
    })

    if (error) {
      toast.error("Error al registrar entrega")
      return
    }

    // Imprimir
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Entrega de Elemento</title>
            <style>
              @media print {
                @page { margin: 20mm; }
                body { margin: 0; }
              }
            </style>
          </head>
          <body>${generateHtml()}</body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }

    toast.success("Entrega registrada e impresa")
    resetForm()
    if (onEntregaCreated) onEntregaCreated()
  }

  const resetForm = () => {
    setFormData({
      empleado_id: "",
      plantilla_id: "",
      cantidad: "1",
      talla: "",
      observaciones: ""
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Imprimir Documento de Entrega
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="empleado">Empleado *</Label>
                <Select
                  value={formData.empleado_id}
                  onValueChange={(value) => setFormData({ ...formData, empleado_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {empleados.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.apellido}, {emp.nombre} - {emp.legajo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plantilla">Plantilla *</Label>
                <Select
                  value={formData.plantilla_id}
                  onValueChange={(value) => setFormData({ ...formData, plantilla_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar plantilla" />
                  </SelectTrigger>
                  <SelectContent>
                    {plantillas.map((plantilla) => (
                      <SelectItem key={plantilla.id} value={plantilla.id}>
                        {plantilla.nombre} ({plantilla.tipo_elemento})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePreview}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                Vista Previa
              </Button>
              <Button
                onClick={handlePrint}
                className="flex-1"
              >
                <Printer className="h-4 w-4 mr-2" />
                Registrar e Imprimir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa del Documento</DialogTitle>
          </DialogHeader>
          <div
            ref={printRef}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }}
            className="border rounded-lg p-4"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}