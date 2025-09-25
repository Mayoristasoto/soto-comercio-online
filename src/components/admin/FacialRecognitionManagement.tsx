import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Camera, CameraOff, User, CheckCircle, Trash2, UserCheck } from "lucide-react"
import * as faceapi from '@vladmandic/face-api'
import { supabase } from "@/integrations/supabase/client"

interface Empleado {
  id: string
  nombre: string
  apellido: string
  email: string
  face_descriptor?: number[] | null // Optional since it's now in separate table
}

interface FacialRecognitionManagementProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  empleado: Empleado | null
  onFaceUpdated: () => void
}

export default function FacialRecognitionManagement({ 
  open, 
  onOpenChange, 
  empleado, 
  onFaceUpdated 
}: FacialRecognitionManagementProps) {
  const { toast } = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedFace, setCapturedFace] = useState<Float32Array | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (open) {
      loadModels()
    }
    return () => {
      stopCamera()
    }
  }, [open])

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

  const captureface = async () => {
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
      setCapturedFace(faceDescriptor)
      
      toast({
        title: "Rostro capturado",
        description: "El rostro ha sido capturado exitosamente"
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

  const saveFaceDescriptor = async () => {
    if (!empleado || !capturedFace) return

    setIsUpdating(true)
    try {
      // Update face descriptor in secure sensitive data table
      const { error } = await supabase
        .from('empleados_datos_sensibles')
        .upsert({ 
          empleado_id: empleado.id,
          face_descriptor: Array.from(capturedFace)
        })

      if (error) throw error

      // Log biometric data update for audit
      await supabase.rpc('log_empleado_access', {
        p_empleado_id: empleado.id,
        p_tipo_acceso: 'update_biometric',
        p_datos_accedidos: ['face_descriptor']
      })

      toast({
        title: "Rostro actualizado",
        description: `El rostro de ${empleado.nombre} ${empleado.apellido} ha sido registrado`
      })

      onFaceUpdated()
      handleClose()
    } catch (error) {
      console.error('Error guardando rostro:', error)
      toast({
        title: "Error",
        description: "No se pudo guardar el rostro",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const deleteFaceDescriptor = async () => {
    if (!empleado || !empleado.face_descriptor) return

    if (!confirm('¿Estás seguro de que quieres eliminar el rostro registrado?')) return

    setIsUpdating(true)
    try {
      // Delete face descriptor from secure sensitive data table  
      const { error } = await supabase
        .from('empleados_datos_sensibles')
        .update({ face_descriptor: null })
        .eq('empleado_id', empleado.id)

      if (error) throw error

      // Log biometric data deletion for audit
      await supabase.rpc('log_empleado_access', {
        p_empleado_id: empleado.id,
        p_tipo_acceso: 'delete_biometric',
        p_datos_accedidos: ['face_descriptor']
      })

      toast({
        title: "Rostro eliminado",
        description: `El rostro de ${empleado.nombre} ${empleado.apellido} ha sido eliminado`
      })

      onFaceUpdated()
      handleClose()
    } catch (error) {
      console.error('Error eliminando rostro:', error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el rostro",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleClose = () => {
    stopCamera()
    setCapturedFace(null)
    setIsCapturing(false)
    onOpenChange(false)
  }

  if (!empleado) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Camera className="h-5 w-5" />
            <span>Gestionar Rostro de {empleado.nombre} {empleado.apellido}</span>
          </DialogTitle>
          <DialogDescription>
            Registra o actualiza el rostro del empleado para reconocimiento facial
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Estado actual */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Estado Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {empleado.face_descriptor ? (
                    <>
                      <UserCheck className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Rostro registrado</span>
                      <Badge variant="default">Activo</Badge>
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Sin rostro registrado</span>
                      <Badge variant="outline">Inactivo</Badge>
                    </>
                  )}
                </div>
                {empleado.face_descriptor && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deleteFaceDescriptor}
                    disabled={isUpdating}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

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
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                
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
                      onClick={captureface}
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
                          Capturar Rostro
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
              
              {capturedFace && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-green-800 font-medium">
                          Rostro capturado exitosamente
                        </p>
                        <p className="text-green-700 text-sm">
                          Presiona "Guardar" para registrar el rostro
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={saveFaceDescriptor}
                      disabled={isUpdating}
                      size="sm"
                    >
                      {isUpdating ? "Guardando..." : "Guardar Rostro"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}