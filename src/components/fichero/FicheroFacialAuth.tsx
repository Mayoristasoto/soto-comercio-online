import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Camera, CameraOff, User, CheckCircle, AlertCircle, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import * as faceapi from '@vladmandic/face-api'
import { supabase } from "@/integrations/supabase/client"

interface FicheroFacialAuthProps {
  empleado: {
    id: string
    nombre: string
    apellido: string
  }
  tipoFichaje: 'entrada' | 'salida' | 'pausa_inicio' | 'pausa_fin'
  onFichajeSuccess: (confianza: number) => void
  loading: boolean
}

export default function FicheroFacialAuth({ 
  empleado, 
  tipoFichaje, 
  onFichajeSuccess,
  loading 
}: FicheroFacialAuthProps) {
  const { toast } = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [livenessCheck, setLivenessCheck] = useState<{
    blinkDetected: boolean
    movementDetected: boolean
    faceCount: number
  }>({
    blinkDetected: false,
    movementDetected: false,
    faceCount: 0
  })
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    loadModels()
    return () => {
      stopCamera()
    }
  }, [])

  const loadModels = async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models')
      ])
      setIsModelLoaded(true)
      toast({
        title: "Modelos cargados",
        description: "Sistema de reconocimiento facial listo",
      })
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
        
        // Iniciar detección continua para liveness
        startLivenessDetection()
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
    setLivenessCheck({
      blinkDetected: false,
      movementDetected: false,
      faceCount: 0
    })
  }

  const startLivenessDetection = () => {
    let previousLandmarks: any = null
    let eyeClosedFrames = 0
    
    const detectLiveness = async () => {
      if (!videoRef.current || !isCameraActive) return
      
      try {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
        
        if (detections.length === 1) {
          const landmarks = detections[0].landmarks
          
          // Detectar parpadeo
          const leftEye = landmarks.getLeftEye()
          const rightEye = landmarks.getRightEye()
          
          const leftEyeHeight = Math.abs(leftEye[1].y - leftEye[5].y)
          const rightEyeHeight = Math.abs(rightEye[1].y - rightEye[5].y)
          const avgEyeHeight = (leftEyeHeight + rightEyeHeight) / 2
          
          if (avgEyeHeight < 3) {
            eyeClosedFrames++
          } else {
            if (eyeClosedFrames > 2) {
              setLivenessCheck(prev => ({ ...prev, blinkDetected: true }))
            }
            eyeClosedFrames = 0
          }
          
          // Detectar movimiento
          if (previousLandmarks) {
            const movement = calculateMovement(landmarks, previousLandmarks)
            if (movement > 2) {
              setLivenessCheck(prev => ({ ...prev, movementDetected: true }))
            }
          }
          previousLandmarks = landmarks
          
          setLivenessCheck(prev => ({ ...prev, faceCount: 1 }))
        } else {
          setLivenessCheck(prev => ({ ...prev, faceCount: detections.length }))
        }
      } catch (error) {
        console.error('Error en detección de liveness:', error)
      }
      
      if (isCameraActive) {
        setTimeout(detectLiveness, 100)
      }
    }
    
    detectLiveness()
  }

  const calculateMovement = (current: any, previous: any): number => {
    const currentNose = current.getNose()[3]
    const previousNose = previous.getNose()[3]
    
    return Math.sqrt(
      Math.pow(currentNose.x - previousNose.x, 2) + 
      Math.pow(currentNose.y - previousNose.y, 2)
    )
  }

  const iniciarFichaje = async () => {
    if (!videoRef.current || !canvasRef.current || !isModelLoaded) return
    
    // Verificar liveness
    if (!livenessCheck.blinkDetected || !livenessCheck.movementDetected || livenessCheck.faceCount !== 1) {
      toast({
        title: "Verificación de vida fallida",
        description: "Debe parpadear y mover ligeramente la cabeza mientras mira a la cámara",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    
    // Countdown
    for (let i = 3; i > 0; i--) {
      setCountdown(i)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    setCountdown(null)
    
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
          description: "Asegúrese de estar mirando directamente a la cámara",
          variant: "destructive"
        })
        return
      }
      
      if (detections.length > 1) {
        toast({
          title: "Múltiples rostros detectados",
          description: "Asegúrese de que solo su rostro esté visible",
          variant: "destructive"
        })
        return
      }
      
      const faceDescriptor = detections[0].descriptor
      
      // Comparar con rostro almacenado
      const confianza = await compararConRostroAlmacenado(faceDescriptor)
      
      if (confianza > 0) {
        onFichajeSuccess(confianza)
        toast({
          title: "Fichaje exitoso",
          description: `${tipoFichaje.replace('_', ' ')} registrada con confianza ${(confianza * 100).toFixed(1)}%`,
        })
      } else {
        toast({
          title: "Rostro no reconocido",
          description: "No se pudo verificar su identidad",
          variant: "destructive"
        })
      }
      
    } catch (error) {
      console.error('Error procesando fichaje:', error)
      toast({
        title: "Error",
        description: "Error procesando el reconocimiento facial",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const compararConRostroAlmacenado = async (capturedDescriptor: Float32Array): Promise<number> => {
    try {
      const { data: empleadoData, error } = await supabase
        .from('empleados')
        .select('face_descriptor')
        .eq('id', empleado.id)
        .single()

      if (error || !empleadoData?.face_descriptor) {
        console.error('No se encontró descriptor facial:', error)
        return 0
      }

      const storedDescriptor = new Float32Array(empleadoData.face_descriptor)
      const distance = faceapi.euclideanDistance(capturedDescriptor, storedDescriptor)
      
      // Convertir distancia a confianza (invertir y normalizar)
      const confidence = Math.max(0, 1 - distance)
      return confidence

    } catch (error) {
      console.error('Error comparando descriptores:', error)
      return 0
    }
  }

  const obtenerTextoAccion = () => {
    switch (tipoFichaje) {
      case 'entrada': return 'Registrar Entrada'
      case 'salida': return 'Registrar Salida'
      case 'pausa_inicio': return 'Iniciar Pausa'
      case 'pausa_fin': return 'Finalizar Pausa'
      default: return 'Fichar'
    }
  }

  const obtenerColorAccion = () => {
    switch (tipoFichaje) {
      case 'entrada': return 'bg-green-500 hover:bg-green-600'
      case 'salida': return 'bg-red-500 hover:bg-red-600'
      case 'pausa_inicio': return 'bg-yellow-500 hover:bg-yellow-600'
      case 'pausa_fin': return 'bg-blue-500 hover:bg-blue-600'
      default: return 'bg-primary hover:bg-primary/90'
    }
  }

  const livenessCompleto = livenessCheck.blinkDetected && livenessCheck.movementDetected && livenessCheck.faceCount === 1

  return (
    <div className="space-y-4">
      {!isModelLoaded && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando modelos de IA...</p>
        </div>
      )}
      
      {isModelLoaded && (
        <>
          {/* Video Feed */}
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
            
            {/* Countdown Overlay */}
            {countdown && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <div className="text-white text-6xl font-bold">{countdown}</div>
              </div>
            )}
            
            {!isCameraActive && (
              <div className="bg-muted rounded-lg p-8 text-center">
                <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Active la cámara para comenzar el fichaje
                </p>
              </div>
            )}
          </div>

          {/* Liveness Check Status */}
          {isCameraActive && (
            <div className="grid grid-cols-3 gap-2">
              <Badge variant={livenessCheck.faceCount === 1 ? "default" : "secondary"} className="justify-center">
                <User className="h-3 w-3 mr-1" />
                {livenessCheck.faceCount === 1 ? "1 Rostro" : `${livenessCheck.faceCount} Rostros`}
              </Badge>
              <Badge variant={livenessCheck.blinkDetected ? "default" : "secondary"} className="justify-center">
                <Eye className="h-3 w-3 mr-1" />
                {livenessCheck.blinkDetected ? "Parpadeo ✓" : "Parpadeo"}
              </Badge>
              <Badge variant={livenessCheck.movementDetected ? "default" : "secondary"} className="justify-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                {livenessCheck.movementDetected ? "Movimiento ✓" : "Movimiento"}
              </Badge>
            </div>
          )}

          {/* Controls */}
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
                  onClick={iniciarFichaje}
                  className={`w-full text-white ${obtenerColorAccion()}`}
                  disabled={isProcessing || loading || !livenessCompleto}
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {obtenerTextoAccion()}
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

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Instrucciones:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Mire directamente a la cámara</li>
                  <li>• Parpadee naturalmente</li>
                  <li>• Mueva ligeramente la cabeza</li>
                  <li>• Asegúrese de tener buena iluminación</li>
                  <li>• Solo su rostro debe estar visible</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}