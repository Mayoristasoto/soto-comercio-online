import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Eye, 
  Plus,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Document {
  id: string
  tipo_documento: string
  nombre_archivo: string
  url_archivo: string
  descripcion?: string
  fecha_subida: string
  activo: boolean
}

interface DocumentManagerProps {
  empleadoId: string
}

const documentTypes = [
  { value: 'contrato', label: 'Contrato', icon: FileText },
  { value: 'identificacion', label: 'Identificación', icon: FileText },
  { value: 'curriculum', label: 'Curriculum Vitae', icon: FileText },
  { value: 'titulo', label: 'Título/Diploma', icon: FileText },
  { value: 'certificado', label: 'Certificado', icon: FileText },
  { value: 'otro', label: 'Otro', icon: FileText }
]

export default function DocumentManager({ empleadoId }: DocumentManagerProps) {
  const { toast } = useToast()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadData, setUploadData] = useState({
    tipo_documento: '',
    descripcion: ''
  })

  useEffect(() => {
    loadDocuments()
  }, [empleadoId])

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('empleado_documentos')
        .select('*')
        .eq('empleado_id', empleadoId)
        .eq('activo', true)
        .order('fecha_subida', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error cargando documentos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los documentos",
        variant: "destructive"
      })
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Archivo muy grande",
          description: "El archivo no puede superar los 10MB",
          variant: "destructive"
        })
        return
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Tipo de archivo no permitido",
          description: "Solo se permiten archivos PDF, Word e imágenes",
          variant: "destructive"
        })
        return
      }

      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !uploadData.tipo_documento) {
      toast({
        title: "Datos incompletos",
        description: "Selecciona un archivo y tipo de documento",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${empleadoId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      // Upload file to storage
      const { data: storageData, error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(fileName, selectedFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(fileName)

      // Save document record
      const { error: dbError } = await supabase
        .from('empleado_documentos')
        .insert({
          empleado_id: empleadoId,
          tipo_documento: uploadData.tipo_documento,
          nombre_archivo: selectedFile.name,
          url_archivo: publicUrl,
          descripcion: uploadData.descripcion || null
        })

      if (dbError) throw dbError

      toast({
        title: "Documento subido",
        description: "El documento se guardó correctamente"
      })

      setUploadOpen(false)
      setSelectedFile(null)
      setUploadData({ tipo_documento: '', descripcion: '' })
      loadDocuments()

    } catch (error) {
      console.error('Error subiendo documento:', error)
      toast({
        title: "Error",
        description: "No se pudo subir el documento",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (documentId: string, fileName: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este documento?')) return

    try {
      // Delete from storage
      const filePath = fileName.split('/').slice(-2).join('/')
      await supabase.storage
        .from('employee-documents')
        .remove([filePath])

      // Mark as inactive in database
      const { error } = await supabase
        .from('empleado_documentos')
        .update({ activo: false })
        .eq('id', documentId)

      if (error) throw error

      toast({
        title: "Documento eliminado",
        description: "El documento se eliminó correctamente"
      })

      loadDocuments()
    } catch (error) {
      console.error('Error eliminando documento:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento",
        variant: "destructive"
      })
    }
  }

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Error descargando archivo:', error)
      toast({
        title: "Error",
        description: "No se pudo descargar el archivo",
        variant: "destructive"
      })
    }
  }

  const getDocumentIcon = (tipo: string) => {
    const docType = documentTypes.find(dt => dt.value === tipo)
    return docType?.icon || FileText
  }

  const getDocumentLabel = (tipo: string) => {
    const docType = documentTypes.find(dt => dt.value === tipo)
    return docType?.label || tipo
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Documentos Laborales</span>
            </CardTitle>
            <CardDescription>
              Gestiona los documentos del empleado
            </CardDescription>
          </div>
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Subir Documento
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sin documentos</h3>
            <p className="text-muted-foreground mb-4">
              No hay documentos cargados para este empleado
            </p>
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Subir primer documento
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => {
                const Icon = getDocumentIcon(doc.tipo_documento)
                return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4" />
                        <span>{getDocumentLabel(doc.tipo_documento)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{doc.nombre_archivo}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {doc.descripcion || 'Sin descripción'}
                    </TableCell>
                    <TableCell>
                      {new Date(doc.fecha_subida).toLocaleDateString('es-AR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownload(doc.url_archivo, doc.nombre_archivo)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(doc.url_archivo, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDelete(doc.id, doc.url_archivo)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        {/* Upload Dialog */}
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Subir Documento</DialogTitle>
              <DialogDescription>
                Carga un nuevo documento para el empleado
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Documento *</Label>
                <Select 
                  value={uploadData.tipo_documento} 
                  onValueChange={(value) => setUploadData(prev => ({ ...prev, tipo_documento: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Archivo *</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                />
                {selectedFile && (
                  <div className="text-sm text-muted-foreground">
                    Archivo seleccionado: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={uploadData.descripcion}
                  onChange={(e) => setUploadData(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Descripción opcional del documento"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Formatos permitidos:</p>
                    <ul className="mt-1 list-disc list-inside">
                      <li>PDF (.pdf)</li>
                      <li>Word (.doc, .docx)</li>
                      <li>Imágenes (.jpg, .png, .webp)</li>
                    </ul>
                    <p className="mt-2">Tamaño máximo: 10MB</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setUploadOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpload} disabled={loading || !selectedFile}>
                  <Upload className="h-4 w-4 mr-2" />
                  {loading ? 'Subiendo...' : 'Subir'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}