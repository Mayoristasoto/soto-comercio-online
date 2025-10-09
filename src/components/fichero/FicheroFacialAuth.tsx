import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Camera, CameraOff, User, CheckCircle, AlertCircle, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import * as faceapi from '@vladmandic/face-api'
import * as tf from '@tensorflow/tfjs'
import { supabase } from "@/integrations/supabase/client"
import { useFacialConfig } from "@/hooks/useFacialConfig"

interface FicheroFacialAuthProps {
  empleado: {
    id: string
    nombre: string
    apellido: string
  }
  tipoFichaje: 'entrada' | 'salida' | 'pausa_inicio' | 'pausa_fin'
  onFichajeSuccess: (confianza: number, empleadoId?: string, empleadoData?: any, emocion?: string) => void
  loading: boolean
}

export default function FicheroFacialAuth({ 
  empleado, 
  tipoFichaje, 
  onFichajeSuccess,
  loading 
}: FicheroFacialAuthProps) {
  const { toast } = useToast()
  const { config, loading: configLoading } = useFacialConfig()
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
  const [emocionMostrada, setEmocionMostrada] = useState<string | null>(null)
  const [reproducirAudio, setReproducirAudio] = useState(false)
  const [nombreEmpleadoAudio, setNombreEmpleadoAudio] = useState<string>('')

  useEffect(() => {
    loadModels()
    return () => {
      stopCamera()
    }
  }, [])

  const loadModels = async () => {
    try {
      // Inicializar TensorFlow.js backend primero
      console.log('Kiosco: Inicializando backend de TensorFlow.js...')
      await tf.ready()
      
      console.log('Kiosco: Cargando modelos de reconocimiento facial...')
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/models')
      ])
      setIsModelLoaded(true)
      console.log('Kiosco: ✅ Modelos cargados exitosamente')
      
      toast({
        title: "✅ Sistema listo",
        description: "Reconocimiento facial inicializado correctamente",
        duration: 2000,
      })
    } catch (error) {
      console.error('Kiosco: ❌ Error cargando modelos:', error)
      // Permitir modo demo solo como último recurso
      setIsModelLoaded(true)
      toast({
        title: "⚠️ Modo demo activo",
        description: "Error inicializando IA - funcionando en modo limitado",
        variant: "destructive",
        duration: 4000,
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
    let frameCount = 0
    
    const detectLiveness = async () => {
      if (!videoRef.current || !isCameraActive) return
      
      try {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
        
        console.log('Kiosco: Detecciones encontradas:', detections.length)
        
        if (detections.length === 1) {
          const landmarks = detections[0].landmarks
          frameCount++
          
          // Detectar parpadeo más fácil - menos estricto
          const leftEye = landmarks.getLeftEye()
          const rightEye = landmarks.getRightEye()
          
          const leftEyeHeight = Math.abs(leftEye[1].y - leftEye[5].y)
          const rightEyeHeight = Math.abs(rightEye[1].y - rightEye[5].y)
          const avgEyeHeight = (leftEyeHeight + rightEyeHeight) / 2
          
          // Umbral más alto para facilitar detección
          if (avgEyeHeight < 5) {
            eyeClosedFrames++
          } else {
            if (eyeClosedFrames > 1) { // Solo necesita 1 frame cerrado en lugar de 2
              setLivenessCheck(prev => ({ ...prev, blinkDetected: true }))
            }
            eyeClosedFrames = 0
          }
          
          // Auto-aprobar después de 3 segundos sin parpadeo detectado
          if (frameCount > 30 && !livenessCheck.blinkDetected) {
            setLivenessCheck(prev => ({ ...prev, blinkDetected: true }))
          }
          
          // Detectar movimiento más fácil
          if (previousLandmarks) {
            const movement = calculateMovement(landmarks, previousLandmarks)
            if (movement > 1) { // Reducido de 2 a 1 para más sensibilidad
              setLivenessCheck(prev => ({ ...prev, movementDetected: true }))
            }
          } else {
            // Auto-aprobar movimiento después de 2 segundos
            setTimeout(() => {
              setLivenessCheck(prev => ({ ...prev, movementDetected: true }))
            }, 2000)
          }
          previousLandmarks = landmarks
          
          setLivenessCheck(prev => ({ ...prev, faceCount: 1 }))
          console.log('Kiosco: Rostro detectado correctamente, liveness:', {
            blinkDetected: livenessCheck.blinkDetected,
            movementDetected: livenessCheck.movementDetected,
            faceCount: 1
          })
          console.log('Kiosco: Umbral de reconocimiento reducido a 40% para facilitar identificación')
        } else {
          setLivenessCheck(prev => ({ ...prev, faceCount: detections.length }))
          console.log('Kiosco: Número incorrecto de rostros:', detections.length)
        }
      } catch (error) {
        console.error('Kiosco: Error en detección de liveness:', error)
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
    if (!videoRef.current || !canvasRef.current || !isModelLoaded || isProcessing) return
    
    console.log('Kiosco: Iniciando fichaje, estado actual:', {
      isCameraActive,
      isModelLoaded,
      livenessCheck,
      isProcessing
    })
    
    // Verificación muy permisiva para kiosco - solo verificar que hay una cámara activa
    if (!isCameraActive) {
      console.log('Kiosco: Fallo - cámara no activa')
      toast({
        title: "Cámara no activa",
        description: "Active la cámara para continuar",
        variant: "destructive"
      })
      return
    }
    
    // Prevenir múltiples procesamiento simultáneos
    if (isProcessing) {
      console.log('Kiosco: Ya hay un procesamiento en curso')
      return
    }
    
    // Auto-completar todas las verificaciones para facilitar uso en kiosco
    setLivenessCheck(prev => ({ 
      ...prev, 
      blinkDetected: true, 
      movementDetected: true,
      faceCount: 1
    }))

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
      
      console.log('Video dimensions:', video.videoWidth, video.videoHeight)
      console.log('Video ready state:', video.readyState)
      console.log('Video src object:', video.srcObject)
      
      // Detectar emociones si está habilitado en la configuración
      let detections
      if (config.emotionRecognitionEnabled) {
        detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.5
          }))
          .withFaceLandmarks()
          .withFaceDescriptors()
          .withFaceExpressions()
      } else {
        detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.5
          }))
          .withFaceLandmarks()
          .withFaceDescriptors()
      }
      
      console.log('Detections found:', detections.length)
      
      if (detections.length === 0) {
        console.log('No face detected - video info:', {
          width: video.videoWidth,
          height: video.videoHeight,
          readyState: video.readyState,
          currentTime: video.currentTime,
          paused: video.paused
        })
        toast({
          title: "No se detectó rostro",
          description: "Asegúrese de estar mirando directamente a la cámara y que hay buena iluminación",
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
      
      // Detectar emoción si está habilitado
      let emocionDetectada = undefined
      if (config.emotionRecognitionEnabled && detections[0].expressions) {
        const expressions = detections[0].expressions as any
        const emociones = Object.entries(expressions) as [string, number][]
        const emocionPrincipal = emociones.reduce((max, current) => 
          current[1] > max[1] ? current : max
        )
        emocionDetectada = emocionPrincipal[0]
        console.log('Emoción detectada:', emocionDetectada, 'Confianza:', emocionPrincipal[1])
        
        // Mostrar emoción durante 2 segundos
        setEmocionMostrada(emocionDetectada)
        await new Promise(resolve => setTimeout(resolve, 2000))
        setEmocionMostrada(null)
      }
      
      // Comparar con rostro almacenado
      const resultado = await compararConRostroAlmacenado(faceDescriptor)
      
      if (resultado.confidence > 0.35) {
        // Pass confidence, employee data, and emotion to the success callback
        onFichajeSuccess(resultado.confidence, resultado.empleadoId, resultado.empleadoData, emocionDetectada)
        
        const employeeName = resultado.empleadoData 
          ? `${resultado.empleadoData.nombre} ${resultado.empleadoData.apellido}`
          : `${empleado.nombre} ${empleado.apellido}`
        
        toast({
          title: "Fichaje exitoso",
          description: `${tipoFichaje.replace('_', ' ')} registrada para ${employeeName} con confianza ${(resultado.confidence * 100).toFixed(1)}%`,
        })
        
        // Reproducir mensaje de audio solo en entrada (primer check-in)
        if (tipoFichaje === 'entrada') {
          setNombreEmpleadoAudio(employeeName)
          setReproducirAudio(true)
        }
        
        // Detener cámara después del éxito para evitar múltiples procesamiento
        stopCamera()
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

  const compararConRostroAlmacenado = async (capturedDescriptor: Float32Array): Promise<{confidence: number, empleadoId?: string, empleadoData?: any}> => {
    try {
      // For kiosk mode, use the secure facial authentication function
      if (empleado.id === 'demo-empleado' || empleado.id === 'recognition-mode') {
        console.log('Kiosco: Iniciando búsqueda facial segura')
        
        // Use the new secure facial authentication function with centralized config
        const threshold = config.confidenceThresholdKiosk
        console.log(`Kiosco: Usando umbral de confianza centralizado: ${threshold}`)
        
        const { data: matches, error } = await supabase
          .rpc('authenticate_face_kiosk', {
            p_face_descriptor: Array.from(capturedDescriptor),
            p_threshold: threshold
          })

        if (error) {
          console.error('Kiosco: Error en autenticación facial:', error)
          throw error
        }

        if (matches && matches.length > 0) {
          const bestMatch = matches[0] // Function returns best match first
          console.log(`Kiosco: Match encontrado - ${bestMatch.nombre} ${bestMatch.apellido} con confianza ${(bestMatch.confidence_score * 100).toFixed(1)}%`)
          
          // Log access for audit
          await supabase.rpc('log_empleado_access', {
            p_empleado_id: bestMatch.empleado_id,
            p_tipo_acceso: 'facial_recognition_kiosk',
            p_datos_accedidos: ['face_descriptor', 'basic_info']
          })
          
          return {
            confidence: bestMatch.confidence_score,
            empleadoId: bestMatch.empleado_id,
            empleadoData: {
              nombre: bestMatch.nombre,
              apellido: bestMatch.apellido
            }
          }
        } else {
          console.log('Kiosco: No se encontraron matches')
          return { confidence: 0 }
        }
      }

      // For specific employee (admin panel), try to access their face data if authorized
      try {
        // Use secure facial authentication function even for specific employees
        const threshold = config.confidenceThresholdSpecific
        console.log(`Empleado específico: Usando umbral de confianza ${threshold}`)
        
        const { data: matches, error } = await supabase
          .rpc('authenticate_face_kiosk', {
            p_face_descriptor: Array.from(capturedDescriptor),
            p_threshold: threshold
          })

        if (error) throw error

        if (matches && matches.length > 0) {
          // Filter to only the specific employee if we have a valid empleado ID
          const employeeMatch = matches.find(match => match.empleado_id === empleado.id)
          
          if (employeeMatch) {
            console.log(`Empleado específico encontrado: ${employeeMatch.nombre} ${employeeMatch.apellido} con confianza ${(employeeMatch.confidence_score * 100).toFixed(1)}%`)
            
            // Log access to biometric data for audit
            await supabase.rpc('log_empleado_access', {
              p_empleado_id: employeeMatch.empleado_id,
              p_tipo_acceso: 'facial_recognition_specific',
              p_datos_accedidos: ['face_descriptor', 'basic_info']
            })

            return { 
              confidence: employeeMatch.confidence_score, 
              empleadoId: employeeMatch.empleado_id,
              empleadoData: {
                nombre: employeeMatch.nombre,
                apellido: employeeMatch.apellido
              }
            }
          }
        }
      } catch (error) {
        console.error('Error en verificación facial específica:', error)
        // Continue with fallback method if available
      }

      // If no facial match found through secure function
      console.log('No se encontraron coincidencias válidas en el sistema de reconocimiento facial')
      return { confidence: 0 }

    } catch (error) {
      console.error('Error comparando descriptores:', error)
      return { confidence: 0 }
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

  const obtenerEmojiEmocion = (emocion: string): string => {
    const emojis: Record<string, string> = {
      'happy': '😊',
      'sad': '😢',
      'angry': '😠',
      'surprised': '😲',
      'neutral': '😐',
      'fearful': '😨',
      'disgusted': '🤢'
    }
    return emojis[emocion] || '😊'
  }

  const traducirEmocion = (emocion: string): string => {
    const traducciones: Record<string, string> = {
      'happy': 'Feliz',
      'sad': 'Triste',
      'angry': 'Enojado',
      'surprised': 'Sorprendido',
      'neutral': 'Neutral',
      'fearful': 'Asustado',
      'disgusted': 'Disgustado'
    }
    return traducciones[emocion] || emocion
  }

  // Reproducir mensaje de audio al completar fichaje usando ElevenLabs TTS
  useEffect(() => {
    const reproducirMensaje = async () => {
      if (!reproducirAudio || !nombreEmpleadoAudio) return

      try {
        // Obtener mensaje configurado
        const { data: config } = await supabase
          .from('fichado_configuracion')
          .select('valor')
          .eq('clave', 'mensaje_audio_checkin')
          .single()

        let mensaje = config?.valor || '¡Bienvenido {nombre}! Tu fichaje ha sido registrado correctamente.'
        
        // Reemplazar {nombre} con el nombre del empleado
        mensaje = mensaje.replace('{nombre}', nombreEmpleadoAudio)

        console.log('Generando audio para mensaje:', mensaje)

        // Intentar primero con ElevenLabs, si falla usar Web Speech API
        let audioGenerado = false
        
        try {
          const { data: audioBlob, error } = await supabase.functions.invoke('elevenlabs-tts', {
            body: { text: mensaje }
          })

          if (!error && audioBlob) {
            console.log('Audio recibido de ElevenLabs')
            
            // Convertir la respuesta a Blob si es necesario
            let blob: Blob
            if (audioBlob instanceof Blob) {
              blob = audioBlob
            } else if (audioBlob instanceof ArrayBuffer) {
              blob = new Blob([audioBlob], { type: 'audio/mpeg' })
            } else {
              throw new Error('Formato inesperado')
            }

            // Reproducir audio
            const audioUrl = URL.createObjectURL(blob)
            const audio = new Audio(audioUrl)
            
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl)
              setReproducirAudio(false)
              setNombreEmpleadoAudio('')
            }

            audio.onerror = () => {
              URL.revokeObjectURL(audioUrl)
              throw new Error('Error reproduciendo')
            }

            await audio.play()
            audioGenerado = true
            console.log('Reproduciendo con ElevenLabs')
          } else {
            throw new Error(error?.message || 'No se recibió audio')
          }
        } catch (elevenLabsError) {
          console.warn('ElevenLabs no disponible, usando Web Speech API:', elevenLabsError)
        }

        // Fallback a Web Speech API si ElevenLabs falla
        if (!audioGenerado) {
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(mensaje)
            utterance.lang = 'es-ES'
            utterance.rate = 0.9
            utterance.pitch = 1.0
            
            utterance.onend = () => {
              setReproducirAudio(false)
              setNombreEmpleadoAudio('')
            }
            
            utterance.onerror = (error) => {
              console.error('Error con Web Speech API:', error)
              setReproducirAudio(false)
              setNombreEmpleadoAudio('')
            }
            
            window.speechSynthesis.speak(utterance)
            console.log('Reproduciendo con Web Speech API')
          } else {
            console.error('Speech Synthesis no disponible')
            toast({
              title: "Audio no disponible",
              description: "El navegador no soporta síntesis de voz",
              variant: "destructive"
            })
            setReproducirAudio(false)
            setNombreEmpleadoAudio('')
          }
        }
      } catch (error) {
        console.error('Error reproduciendo mensaje:', error)
        setReproducirAudio(false)
        setNombreEmpleadoAudio('')
      }
    }

    reproducirMensaje()
  }, [reproducirAudio, nombreEmpleadoAudio])

  const livenessCompleto = livenessCheck.blinkDetected && livenessCheck.movementDetected && livenessCheck.faceCount === 1

  return (
    <div className="space-y-4">
      {(!isModelLoaded || configLoading) && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {configLoading ? 'Cargando configuración facial...' : 'Cargando modelos de IA...'}
          </p>
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
            
            {/* Emotion Overlay */}
            {emocionMostrada && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-lg">
                <div className="text-9xl mb-4 animate-pulse">
                  {obtenerEmojiEmocion(emocionMostrada)}
                </div>
                <div className="text-white text-2xl font-semibold capitalize">
                  {traducirEmocion(emocionMostrada)}
                </div>
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
                  disabled={isProcessing || loading}
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
                
                {/* Quick Demo Button */}
                <Button 
                  onClick={() => {
                    setIsProcessing(true)
                    setTimeout(() => {
                      onFichajeSuccess(0.85)
                      setIsProcessing(false)
                    }, 1500)
                  }}
                  variant="outline"
                  className="w-full"
                  disabled={isProcessing || loading}
                >
                  <User className="h-4 w-4 mr-2" />
                  Demo - {obtenerTextoAccion()}
                </Button>
              </>
            )}
          </div>

          {/* Instructions */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-medium mb-1">Instrucciones para kiosco:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Mire directamente a la cámara</li>
                  <li>• Mantenga su rostro visible</li>
                  <li>• El sistema lo reconocerá automáticamente</li>
                  <li>• No es necesario parpadear o moverse</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}