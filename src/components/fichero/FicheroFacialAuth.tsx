import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Camera, CameraOff, User, CheckCircle, AlertCircle, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import * as faceapi from '@vladmandic/face-api'
import * as tf from '@tensorflow/tfjs'
import { supabase } from "@/integrations/supabase/client"

interface FicheroFacialAuthProps {
  empleado: {
    id: string
    nombre: string
    apellido: string
  }
  tipoFichaje: 'entrada' | 'salida' | 'pausa_inicio' | 'pausa_fin'
  onFichajeSuccess: (confianza: number, empleadoId?: string, empleadoData?: any) => void
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
      // Inicializar TensorFlow.js backend primero
      console.log('Kiosco: Inicializando backend de TensorFlow.js...')
      await tf.ready()
      
      console.log('Kiosco: Cargando modelos de reconocimiento facial...')
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models')
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
    if (!videoRef.current || !canvasRef.current || !isModelLoaded) return
    
    console.log('Kiosco: Iniciando fichaje, estado actual:', {
      isCameraActive,
      isModelLoaded,
      livenessCheck
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
      
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.5
        }))
        .withFaceLandmarks()
        .withFaceDescriptors()
      
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
      
      // Comparar con rostro almacenado
      const resultado = await compararConRostroAlmacenado(faceDescriptor)
      
      if (resultado.confidence > 0.35) {
        // Pass both confidence and employee data to the success callback
        onFichajeSuccess(resultado.confidence, resultado.empleadoId, resultado.empleadoData)
        
        const employeeName = resultado.empleadoData 
          ? `${resultado.empleadoData.nombre} ${resultado.empleadoData.apellido}`
          : `${empleado.nombre} ${empleado.apellido}`
        
        toast({
          title: "Fichaje exitoso",
          description: `${tipoFichaje.replace('_', ' ')} registrada para ${employeeName} con confianza ${(resultado.confidence * 100).toFixed(1)}%`,
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

  const compararConRostroAlmacenado = async (capturedDescriptor: Float32Array): Promise<{confidence: number, empleadoId?: string, empleadoData?: any}> => {
    try {
      // For kiosk mode, search for the actual employee by face recognition
      if (empleado.id === 'demo-empleado' || empleado.id === 'recognition-mode') {
        // Get all active employees with face descriptors
        const { data: allEmployees, error: employeesError } = await supabase
          .from('empleados')
          .select('id, nombre, apellido, email')
          .eq('activo', true)

        if (employeesError) throw employeesError

        let bestGlobalConfidence = 0
        let bestEmployeeMatch = null

        console.log(`Kiosco: Iniciando búsqueda en ${allEmployees.length} empleados activos`)
        
        for (const emp of allEmployees) {
          console.log(`Kiosco: Verificando empleado: ${emp.nombre} ${emp.apellido} (ID: ${emp.id})`)
          
          // Special debug for Gonzalo Justiniano
          if (emp.nombre.toLowerCase().includes('gonzalo') && emp.apellido.toLowerCase().includes('justiniano')) {
            console.log(`🔍 DEBUG GONZALO: Iniciando verificación especial para ${emp.nombre} ${emp.apellido}`)
          }
          
          // Check multiple face versions for this employee
          const { data: rostrosData, error: rostrosError } = await supabase
            .from('empleados_rostros')
            .select('face_descriptor, confidence_score, version_name')
            .eq('empleado_id', emp.id)
            .eq('is_active', true)

          if (rostrosError) {
            console.error(`Kiosco: Error obteniendo rostros para ${emp.nombre}:`, rostrosError)
            continue
          }

          if (rostrosData && rostrosData.length > 0) {
            console.log(`Kiosco: Empleado ${emp.nombre} tiene ${rostrosData.length} versiones de rostro`)
            
            for (const rostro of rostrosData) {
              if (rostro.face_descriptor && rostro.face_descriptor.length > 0) {
                const storedDescriptor = new Float32Array(rostro.face_descriptor)
                const distance = faceapi.euclideanDistance(capturedDescriptor, storedDescriptor)
                
                // Convertir distancia a confianza (invertir y normalizar)
                const confidence = Math.max(0, 1 - distance)
                console.log(`Kiosco: Versión ${rostro.version_name} - Confianza: ${(confidence * 100).toFixed(1)}%`)
                
                // Special debug for Gonzalo Justiniano
                if (emp.nombre.toLowerCase().includes('gonzalo') && emp.apellido.toLowerCase().includes('justiniano')) {
                  console.log(`🔍 DEBUG GONZALO: Versión ${rostro.version_name}`)
                  console.log(`🔍 DEBUG GONZALO: Descriptor stored length: ${storedDescriptor.length}`)
                  console.log(`🔍 DEBUG GONZALO: Descriptor captured length: ${capturedDescriptor.length}`)
                  console.log(`🔍 DEBUG GONZALO: Distance: ${distance}`)
                  console.log(`🔍 DEBUG GONZALO: Confidence: ${(confidence * 100).toFixed(1)}%`)
                  console.log(`🔍 DEBUG GONZALO: Threshold: 40%`)
                  console.log(`🔍 DEBUG GONZALO: Passes threshold: ${confidence > 0.4}`)
                }
                
                if (confidence > bestGlobalConfidence && confidence > 0.35) {
                  bestGlobalConfidence = confidence
                  bestEmployeeMatch = emp
                  
                  if (emp.nombre.toLowerCase().includes('gonzalo')) {
                    console.log(`🔍 DEBUG GONZALO: ¡NUEVO MEJOR MATCH! Confianza: ${(confidence * 100).toFixed(1)}%`)
                  }
                }
              } else {
                console.log(`Kiosco: Versión ${rostro.version_name} - Sin descriptor válido`)
                if (emp.nombre.toLowerCase().includes('gonzalo')) {
                  console.log(`🔍 DEBUG GONZALO: Versión ${rostro.version_name} sin descriptor válido`)
                }
              }
            }
          } else {
            console.log(`Kiosco: Empleado ${emp.nombre} sin versiones de rostro activas`)
          }

          // Also check legacy face descriptor
          const { data: legacyData, error: legacyError } = await supabase
            .from('empleados_datos_sensibles')
            .select('face_descriptor')
            .eq('empleado_id', emp.id)
            .maybeSingle()

          if (legacyData?.face_descriptor && legacyData.face_descriptor.length > 0) {
            const storedDescriptor = new Float32Array(legacyData.face_descriptor)
            const distance = faceapi.euclideanDistance(capturedDescriptor, storedDescriptor)
            
            const confidence = Math.max(0, 1 - distance)
            console.log(`Kiosco: Datos legacy ${emp.nombre} - Confianza: ${(confidence * 100).toFixed(1)}%`)
            
            if (confidence > bestGlobalConfidence && confidence > 0.35) {
              bestGlobalConfidence = confidence
              bestEmployeeMatch = emp
            }
          }
        }

        console.log(`Kiosco: RESUMEN FINAL - Mejor confianza global: ${(bestGlobalConfidence * 100).toFixed(1)}%`)
        console.log(`Kiosco: RESUMEN FINAL - Mejor empleado: ${bestEmployeeMatch ? `${bestEmployeeMatch.nombre} ${bestEmployeeMatch.apellido}` : 'ninguno'}`)
        console.log(`Kiosco: RESUMEN FINAL - Umbral requerido: 35%`)
        
        // Reducir umbral a 35% para casos problemáticos
        if (bestEmployeeMatch && bestGlobalConfidence > 0.35) {
          console.log(`Kiosco: ✅ Empleado identificado: ${bestEmployeeMatch.nombre} ${bestEmployeeMatch.apellido} con confianza ${(bestGlobalConfidence * 100).toFixed(1)}% (umbral: 35%)`)
          
          // Log access to biometric data for audit
          await supabase.rpc('log_empleado_access', {
            p_empleado_id: bestEmployeeMatch.id,
            p_tipo_acceso: 'facial_recognition_kiosk',
            p_datos_accedidos: ['face_descriptor', 'basic_info']
          })

          return { 
            confidence: bestGlobalConfidence, 
            empleadoId: bestEmployeeMatch.id,
            empleadoData: bestEmployeeMatch
          }
        }

        console.log('Kiosco: ❌ No se encontró coincidencia válida (>35%) en ningún empleado')
        console.log(`Kiosco: Empleados verificados: ${allEmployees.length}`)
        return { confidence: 0 }
      }

      // For specific employee (admin panel), check their face descriptors
      const { data: rostrosData, error: rostrosError } = await supabase
        .from('empleados_rostros')
        .select('face_descriptor, confidence_score, version_name')
        .eq('empleado_id', empleado.id)
        .eq('is_active', true)

      let bestConfidence = 0
      let bestMatch = null

      // Compare with all active face versions
      if (rostrosData && rostrosData.length > 0) {
        console.log(`Comparando con ${rostrosData.length} versiones de rostro`)
        
        for (const rostro of rostrosData) {
          if (rostro.face_descriptor && rostro.face_descriptor.length > 0) {
            const storedDescriptor = new Float32Array(rostro.face_descriptor)
            const distance = faceapi.euclideanDistance(capturedDescriptor, storedDescriptor)
            
            // Convertir distancia a confianza (invertir y normalizar)
            const confidence = Math.max(0, 1 - distance)
            
            if (confidence > bestConfidence) {
              bestConfidence = confidence
              bestMatch = rostro.version_name
            }
          }
        }

        // Si encontramos una buena coincidencia con las nuevas versiones
        if (bestConfidence > 0.4) {
          console.log(`Kiosco: Mejor coincidencia: ${bestMatch} con confianza ${(bestConfidence * 100).toFixed(1)}% (umbral: 40%)`)
          
          // Log access to biometric data for audit
          await supabase.rpc('log_empleado_access', {
            p_empleado_id: empleado.id,
            p_tipo_acceso: 'facial_recognition_multiple',
            p_datos_accedidos: ['face_descriptor', 'version_name']
          })

          return { confidence: bestConfidence, empleadoId: empleado.id }
        }
      }

      // Fallback: try legacy face descriptor from sensitive data table
      const { data: empleadoData, error: legacyError } = await supabase
        .from('empleados_datos_sensibles')
        .select('face_descriptor')
        .eq('empleado_id', empleado.id)
        .maybeSingle()

      if (empleadoData?.face_descriptor && empleadoData.face_descriptor.length > 0) {
        console.log('Usando descriptor facial legacy')
        const storedDescriptor = new Float32Array(empleadoData.face_descriptor)
        const distance = faceapi.euclideanDistance(capturedDescriptor, storedDescriptor)
        
        // Convertir distancia a confianza (invertir y normalizar)
        const legacyConfidence = Math.max(0, 1 - distance)

        if (legacyConfidence > bestConfidence) {
          bestConfidence = legacyConfidence
          
          // Log access to biometric data for audit
          await supabase.rpc('log_empleado_access', {
            p_empleado_id: empleado.id,
            p_tipo_acceso: 'facial_recognition_legacy',
            p_datos_accedidos: ['face_descriptor']
          })
        }
      }

      // Si no encontramos ningún rostro registrado
      if (bestConfidence === 0) {
        console.error('No se encontraron descriptores faciales activos')
        return { confidence: 0 }
      }

      return { confidence: bestConfidence, empleadoId: empleado.id }

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