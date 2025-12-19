import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Camera, Loader2, CheckCircle2, RotateCcw, Send, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const FacialPhotoCapture = () => {
  const [step, setStep] = useState<'identify' | 'capture' | 'confirm' | 'success'>('identify');
  const [loading, setLoading] = useState(false);
  const [empleadosLoading, setEmpleadosLoading] = useState(false);
  const [empleadosError, setEmpleadosError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmpleado, setSelectedEmpleado] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    loadEmpleados();
    return () => {
      stopCamera();
    };
  }, []);

  const loadEmpleados = async () => {
    setEmpleadosLoading(true);
    setEmpleadosError(null);

    // Usar función SECURITY DEFINER para acceso público (kiosco sin autenticación)
    const { data, error } = await supabase.rpc('get_empleados_kiosk_minimal');

    if (!error && data) {
      setEmpleados(Array.isArray(data) ? data : []);
    } else {
      const msg = error?.message || 'No se pudo cargar la lista de empleados.';
      setEmpleados([]);
      setEmpleadosError(msg);
      console.error('Error cargando empleados:', error);
      toast({
        title: 'Error cargando empleados',
        description: msg,
        variant: 'destructive',
      });
    }

    setEmpleadosLoading(false);
  };

  const filteredEmpleados = empleados.filter(emp => 
    `${emp.nombre} ${emp.apellido}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: 'Error',
        description: 'No se pudo acceder a la cámara. Verifica los permisos.',
        variant: 'destructive',
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(imageData);
      setStep('confirm');
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setStep('capture');
    startCamera();
  };

  const uploadPhoto = async () => {
    if (!capturedImage || !selectedEmpleado) return;

    setLoading(true);

    try {
      // Convertir base64 a blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      // Subir a Storage
      const fileName = `${selectedEmpleado.id}/${Date.now()}.jpg`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('facial-photos')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('facial-photos')
        .getPublicUrl(fileName);

      // Crear registro usando función SECURITY DEFINER (bypasses RLS)
      const { error: insertError } = await supabase
        .rpc('kiosk_upload_facial_photo', {
          p_empleado_id: selectedEmpleado.id,
          p_photo_url: publicUrl
        });

      if (insertError) throw insertError;

      setStep('success');
      
      toast({
        title: 'Foto enviada exitosamente',
        description: 'Tu foto está pendiente de revisión por RRHH',
      });

      // Reset después de 5 segundos
      setTimeout(() => {
        resetForm();
      }, 5000);
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error al enviar foto',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('identify');
    setSearchTerm('');
    setSelectedEmpleado(null);
    setCapturedImage(null);
    stopCamera();
  };

  const handleSelectEmpleado = (empleado: any) => {
    setSelectedEmpleado(empleado);
    setStep('capture');
    setTimeout(() => startCamera(), 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center px-4 sm:px-6">
          <div className="mx-auto mb-3 sm:mb-4 h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Camera className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          </div>
          <CardTitle className="text-xl sm:text-3xl">Registro de Foto Facial</CardTitle>
          <CardDescription className="text-sm sm:text-lg">
            {step === 'identify' && 'Busca tu nombre para comenzar'}
            {step === 'capture' && 'Posiciónate frente a la cámara'}
            {step === 'confirm' && 'Revisa tu foto antes de enviar'}
            {step === 'success' && 'Foto enviada exitosamente'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
          {/* Paso 1: Identificación */}
          {step === 'identify' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="search" className="text-base sm:text-lg">
                  Buscar empleado
                </Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Escribe tu nombre o apellido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-2 text-base sm:text-lg h-12 sm:h-14"
                  autoFocus
                />
              </div>

              {searchTerm.length >= 2 && (
                <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-2">
                  {empleadosLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Cargando empleados...
                    </div>
                  ) : empleadosError ? (
                    <div className="space-y-3 p-2">
                      <Alert variant="destructive">
                        <AlertDescription>
                          {empleadosError}
                        </AlertDescription>
                      </Alert>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={loadEmpleados}
                      >
                        Reintentar
                      </Button>
                    </div>
                  ) : filteredEmpleados.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No se encontraron empleados
                      {empleados.length === 0 ? ' (lista vacía)' : ''}
                    </div>
                  ) : (
                    filteredEmpleados.map((emp) => (
                      <Button
                        key={emp.id}
                        variant="outline"
                        className="w-full justify-start h-auto py-3 sm:py-4"
                        onClick={() => handleSelectEmpleado(emp)}
                      >
                        <User className="h-5 w-5 mr-3 flex-shrink-0" />
                        <div className="text-left">
                          <div className="font-medium text-sm sm:text-base">
                            {emp.apellido}, {emp.nombre}
                          </div>
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Paso 2: Captura */}
          {step === 'capture' && (
            <div className="space-y-4">
              <Alert>
                <Camera className="h-4 w-4" />
                <AlertDescription>
                  <strong>Empleado:</strong> {selectedEmpleado?.nombre} {selectedEmpleado?.apellido}
                </AlertDescription>
              </Alert>

              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="font-medium text-sm">Consejos para una buena foto:</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>Mira directamente a la cámara</li>
                  <li>Asegúrate de tener buena iluminación</li>
                  <li>No uses gafas de sol ni accesorios que cubran tu rostro</li>
                  <li>Mantén una expresión neutral</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1"
                  size="lg"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={capturePhoto}
                  disabled={!cameraActive}
                  className="flex-1"
                  size="lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Capturar Foto
                </Button>
              </div>
            </div>
          )}

          {/* Paso 3: Confirmación */}
          {step === 'confirm' && capturedImage && (
            <div className="space-y-4">
              <Alert>
                <User className="h-4 w-4" />
                <AlertDescription>
                  <strong>Empleado:</strong> {selectedEmpleado?.nombre} {selectedEmpleado?.apellido}
                </AlertDescription>
              </Alert>

              <div className="rounded-lg overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Foto capturada"
                  className="w-full h-auto"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={retakePhoto}
                  className="flex-1"
                  size="lg"
                  disabled={loading}
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Tomar Otra
                </Button>
                <Button
                  onClick={uploadPhoto}
                  className="flex-1"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Enviar Foto
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Paso 4: Éxito */}
          {step === 'success' && (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-green-600 mb-2">
                  ¡Foto Enviada Exitosamente!
                </h3>
                <p className="text-muted-foreground">
                  Tu foto está pendiente de revisión por RRHH.
                  <br />
                  Serás notificado cuando sea aprobada.
                </p>
              </div>
              <Button onClick={resetForm} size="lg">
                Registrar Otra Foto
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
