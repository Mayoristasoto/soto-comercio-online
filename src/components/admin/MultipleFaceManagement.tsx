import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Camera, CameraOff, User, CheckCircle, Trash2, UserCheck, Plus, Eye } from "lucide-react"
import * as faceapi from '@vladmandic/face-api'
import { supabase } from "@/integrations/supabase/client"

interface Empleado {
  id: string
  nombre: string
  apellido: string
  email: string
}

interface FaceVersion {
  id: string
  version_name: string
  created_at: string
  is_active: boolean
  confidence_score: number
}

interface MultipleFaceManagementProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  empleado: Empleado | null
  onFaceUpdated: () => void
}

export default function MultipleFaceManagement({ 
  open, 
  onOpenChange, 
  empleado, 
  onFaceUpdated 
}: MultipleFaceManagementProps) {
  const { toast } = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedFace, setCapturedFace] = useState<{ descriptor: Float32Array; confidence: number } | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [faceVersions, setFaceVersions] = useState<FaceVersion[]>([])
  const [versionName, setVersionName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    if (open && empleado) {
      loadModels()
      loadFaceVersions()
    }
    return () => {
      stopCamera()
    }
  }, [open, empleado])

  const loadModels = async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models')
      ])
      setIsModelLoaded(true)
    } catch (error) {
      console.error('Error cargando modelos:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los modelos de reconocimiento facial",
        variant: "destructive"
      })
    }
  }

  const loadFaceVersions = async () => {
    if (!empleado) return

    try {
      const { data, error } = await supabase
        .from('empleados_rostros')
        .select('id, version_name, created_at, is_active, confidence_score')
        .eq('empleado_id', empleado.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFaceVersions(data || [])
    } catch (error) {
      console.error('Error cargando versiones de rostro:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las versiones de rostro",
        variant: "destructive"
      })
    }
  }

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        setStream(mediaStream)
        setIsCameraActive(true)
      }
    } catch (error) {
      console.error('Error accediendo a la cámara:', error)
      toast({
        title: "Error",
        description: "No se pudo acceder a la cámara",
        variant: "destructive"
      })
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsCameraActive(false)
  }

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current || !isModelLoaded) return

    setIsCapturing(true)
    
    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')!
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)
      
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors()
      
      if (detections.length === 0) {
        toast({
          title: "No se detectó rostro",
          description: "Asegúrate de estar mirando directamente a la cámara",
          variant: "destructive"
        })
        return
      }
      
      if (detections.length > 1) {
        toast({
          title: "Múltiples rostros detectados",
          description: "Asegúrate de que solo un rostro esté visible",
          variant: "destructive"
        })
        return
      }
      
      const faceDescriptor = detections[0].descriptor
      const detectionScore = detections[0].detection.score
      
      setCapturedFace({ 
        descriptor: faceDescriptor, 
        confidence: detectionScore 
      })
      setShowAddForm(true)
      
      // Generate default version name
      const versionNumber = faceVersions.length + 1
      setVersionName(`Versión ${versionNumber}`)
      
      toast({
        title: "Rostro capturado",
        description: `Confianza de detección: ${(detectionScore * 100).toFixed(1)}%`
      })
      
    } catch (error) {
      console.error('Error capturando rostro:', error)
      toast({
        title: "Error",
        description: "Error procesando el rostro",
        variant: "destructive"
      })
    } finally {
      setIsCapturing(false)
    }
  }

  const saveFaceVersion = async () => {
    if (!empleado || !capturedFace || !versionName.trim()) return

    setIsUpdating(true)
    try {
      // Save new face version with actual detection confidence
      const { error } = await supabase
        .from('empleados_rostros')
        .insert({ 
          empleado_id: empleado.id,
          face_descriptor: Array.from(capturedFace.descriptor),
          version_name: versionName.trim(),
          confidence_score: capturedFace.confidence,
          capture_metadata: {
            captured_at: new Date().toISOString(),
            device_info: navigator.userAgent,
            detection_confidence: capturedFace.confidence
          }
        })

      if (error) throw error

      // Log the activity
      await supabase.rpc('log_empleado_access', {
        p_empleado_id: empleado.id,
        p_tipo_acceso: 'add_face_version',
        p_datos_accedidos: ['face_descriptor', 'version_name']
      })

      toast({
        title: "Versión de rostro guardada",
        description: `Se agregó "${versionName}" para ${empleado.nombre} ${empleado.apellido}`
      })

      // Reset form
      setCapturedFace(null)
      setVersionName('')
      setShowAddForm(false)
      
      // Reload data
      loadFaceVersions()
      onFaceUpdated()
    } catch (error) {
      console.error('Error guardando versión de rostro:', error)
      toast({
        title: "Error",
        description: "No se pudo guardar la versión del rostro",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const deleteFaceVersion = async (versionId: string, versionName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${versionName}"?`)) return

    try {
      const { error } = await supabase
        .from('empleados_rostros')
        .delete()
        .eq('id', versionId)

      if (error) throw error

      toast({
        title: "Versión eliminada",
        description: `Se eliminó "${versionName}" correctamente`
      })

      loadFaceVersions()
      onFaceUpdated()
    } catch (error) {
      console.error('Error eliminando versión:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la versión",
        variant: "destructive"
      })
    }
  }

  const toggleVersionStatus = async (versionId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('empleados_rostros')
        .update({ is_active: !currentStatus })
        .eq('id', versionId)

      if (error) throw error

      toast({
        title: "Estado actualizado",
        description: `La versión ahora está ${!currentStatus ? 'activa' : 'inactiva'}`
      })

      loadFaceVersions()
      onFaceUpdated()
    } catch (error) {
      console.error('Error actualizando estado:', error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive"
      })
    }
  }

  const handleClose = () => {
    stopCamera()
    setCapturedFace(null)
    setVersionName('')
    setShowAddForm(false)
    setIsCapturing(false)
    onOpenChange(false)
  }

  if (!empleado) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Camera className="h-5 w-5" />
            <span>Gestión de Rostros - {empleado.nombre} {empleado.apellido}</span>
          </DialogTitle>
          <DialogDescription>
            Registra múltiples versiones del rostro para mejorar la precisión del reconocimiento facial
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Versiones existentes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Versiones Registradas ({faceVersions.length})</span>
                <Badge variant={faceVersions.filter(v => v.is_active).length > 0 ? "default" : "outline"}>
                  {faceVersions.filter(v => v.is_active).length} Activas
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {faceVersions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay versiones de rostro registradas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {faceVersions.map((version) => (
                    <div key={version.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${version.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <div>
                          <p className="font-medium">{version.version_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(version.created_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={version.confidence_score >= 0.7 ? "default" : version.confidence_score >= 0.5 ? "secondary" : "destructive"}
                          className="min-w-[80px]"
                        >
                          {(version.confidence_score * 100).toFixed(1)}% confianza
                        </Badge>
                        <Badge variant={version.is_active ? "default" : "secondary"}>
                          {version.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleVersionStatus(version.id, version.is_active)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteFaceVersion(version.id, version.version_name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Captura de nueva versión */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Agregar Nueva Versión</CardTitle>
              <CardDescription>
                Captura una nueva versión del rostro en diferentes condiciones (ángulos, iluminación, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isModelLoaded && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Cargando modelos de IA...</p>
                </div>
              )}
              
              {isModelLoaded && (
                <>
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className={`w-full rounded-lg border ${isCameraActive ? 'block' : 'hidden'}`}
                      style={{ maxHeight: '300px' }}
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {!isCameraActive && (
                      <div className="bg-muted rounded-lg p-8 text-center">
                        <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          Presiona el botón para activar la cámara
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    {!isCameraActive ? (
                      <Button 
                        onClick={startCamera}
                        className="w-full"
                        disabled={!isModelLoaded}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Activar Cámara
                      </Button>
                    ) : (
                      <>
                        <Button 
                          onClick={captureFace}
                          className="w-full"
                          disabled={isCapturing}
                        >
                          {isCapturing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Procesando...
                            </>
                          ) : (
                            <>
                              <User className="h-4 w-4 mr-2" />
                              Capturar Nueva Versión
                            </>
                          )}
                        </Button>
                        
                        <Button 
                          onClick={stopCamera}
                          variant="outline"
                          className="w-full"
                        >
                          <CameraOff className="h-4 w-4 mr-2" />
                          Desactivar Cámara
                        </Button>
                      </>
                    )}
                  </div>
                  
                  {showAddForm && capturedFace && (
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <p className="text-green-800 font-medium">
                                Rostro capturado exitosamente
                              </p>
                            </div>
                            <Badge variant={capturedFace.confidence >= 0.7 ? "default" : "secondary"}>
                              {(capturedFace.confidence * 100).toFixed(1)}% confianza
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="versionName">Nombre de la versión</Label>
                            <Input
                              id="versionName"
                              value={versionName}
                              onChange={(e) => setVersionName(e.target.value)}
                              placeholder="Ej: Perfil derecho, Con lentes, etc."
                            />
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button
                              onClick={saveFaceVersion}
                              disabled={isUpdating || !versionName.trim()}
                              className="flex-1"
                            >
                              {isUpdating ? "Guardando..." : "Guardar Versión"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setCapturedFace(null)
                                setShowAddForm(false)
                                setVersionName('')
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}