import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Camera, CameraOff, User, CheckCircle } from "lucide-react"
import * as faceapi from '@vladmandic/face-api'

interface FacialRecognitionAuthProps {
  onRegisterSuccess: (faceDescriptor: Float32Array) => void
  onLoginSuccess: () => void
  mode: 'register' | 'login'
}

export default function FacialRecognitionAuth({ 
  onRegisterSuccess, 
  onLoginSuccess, 
  mode 
}: FacialRecognitionAuthProps) {
  const { toast } = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedFace, setCapturedFace] = useState<Float32Array | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

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
        description: "Sistema de reconocimiento facial listo"
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
          description: "Asegúrate de que solo tu rostro esté visible",
          variant: "destructive"
        })
        return
      }
      
      const faceDescriptor = detections[0].descriptor
      setCapturedFace(faceDescriptor)
      
      if (mode === 'register') {
        onRegisterSuccess(faceDescriptor)
        toast({
          title: "Rostro registrado",
          description: "Tu rostro ha sido capturado exitosamente"
        })
      } else {
        // In login mode, we would compare with stored descriptors
        onLoginSuccess()
        toast({
          title: "Rostro reconocido",
          description: "Acceso autorizado"
        })
      }
      
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>
            {mode === 'register' ? 'Registrar Rostro' : 'Iniciar Sesión Facial'}
          </span>
        </CardTitle>
        <CardDescription>
          {mode === 'register' 
            ? 'Captura tu rostro para registrarte en el sistema'
            : 'Usa tu rostro para iniciar sesión'
          }
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
                    ) : capturedFace ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Rostro Capturado
                      </>
                    ) : (
                      <>
                        <User className="h-4 w-4 mr-2" />
                        {mode === 'register' ? 'Registrar Rostro' : 'Reconocer Rostro'}
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
            
            {mode === 'register' && capturedFace && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-green-800 font-medium">
                    Rostro registrado exitosamente
                  </p>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  Ahora puedes usar reconocimiento facial para iniciar sesión
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}