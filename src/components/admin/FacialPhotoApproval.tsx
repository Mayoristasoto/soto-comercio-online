import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle2, XCircle, Loader2, Camera, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import * as faceapi from '@vladmandic/face-api';

interface PhotoUpload {
  id: string;
  empleado_id: string;
  photo_url: string;
  estado: string;
  comentarios: string | null;
  created_at: string;
  empleados: {
    nombre: string;
    apellido: string;
    email: string;
  };
}

export const FacialPhotoApproval = () => {
  const [uploads, setUploads] = useState<PhotoUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [comentarios, setComentarios] = useState<{ [key: string]: string }>({});
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDetectionResults, setFaceDetectionResults] = useState<{ [key: string]: any }>({});
  const { toast } = useToast();
  const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});

  useEffect(() => {
    loadModels();
    loadUploads();
  }, []);

  const loadModels = async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ]);
      setModelsLoaded(true);
    } catch (error) {
      console.error('Error loading models:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los modelos de reconocimiento facial',
        variant: 'destructive',
      });
    }
  };

  const loadUploads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facial_photo_uploads')
      .select(`
        *,
        empleados:empleado_id (
          nombre,
          apellido,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las fotos',
        variant: 'destructive',
      });
    } else if (data) {
      setUploads(data as any);
    }
    setLoading(false);
  };

  const detectFace = async (uploadId: string, photoUrl: string) => {
    if (!modelsLoaded) {
      toast({
        title: 'Modelos no cargados',
        description: 'Por favor espera a que se carguen los modelos',
        variant: 'destructive',
      });
      return;
    }

    try {
      const img = await faceapi.fetchImage(photoUrl);
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        setFaceDetectionResults((prev) => ({
          ...prev,
          [uploadId]: {
            detected: true,
            score: detection.detection.score,
            descriptor: Array.from(detection.descriptor),
          },
        }));

        // Dibujar detección en canvas
        const canvas = canvasRefs.current[uploadId];
        if (canvas) {
          const dims = faceapi.matchDimensions(canvas, img, true);
          const resizedDetection = faceapi.resizeResults(detection, dims);
          faceapi.draw.drawDetections(canvas, resizedDetection);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetection);
        }
      } else {
        setFaceDetectionResults((prev) => ({
          ...prev,
          [uploadId]: { detected: false },
        }));
      }
    } catch (error) {
      console.error('Error detecting face:', error);
      toast({
        title: 'Error',
        description: 'No se pudo detectar el rostro',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async (upload: PhotoUpload) => {
    const detection = faceDetectionResults[upload.id];
    
    if (!detection || !detection.detected) {
      toast({
        title: 'Detección requerida',
        description: 'Primero debes verificar que se detecta correctamente el rostro',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(upload.id);

    try {
      // Verificar si ya existen versiones de rostro para este empleado
      const { data: existingVersions, error: versionCheckError } = await supabase
        .from('empleados_rostros')
        .select('version_name, is_active')
        .eq('empleado_id', upload.empleado_id)
        .order('created_at', { ascending: false });

      if (versionCheckError) throw versionCheckError;

      // Determinar el nombre de la versión
      let versionName = 'Versión 1';
      let versionNumber = 1;
      
      if (existingVersions && existingVersions.length > 0) {
        // Calcular el siguiente número de versión
        versionNumber = existingVersions.length + 1;
        versionName = `Versión ${versionNumber}`;

        // Desactivar todas las versiones anteriores (opcional, para que solo la nueva esté activa)
        // Si prefieres que todas estén activas, comenta esta sección
        const { error: deactivateError } = await supabase
          .from('empleados_rostros')
          .update({ is_active: false })
          .eq('empleado_id', upload.empleado_id);

        if (deactivateError) throw deactivateError;
      }

      // Guardar descriptor facial en empleados_datos_sensibles (mantener compatibilidad)
      const { error: updateError } = await supabase
        .from('empleados_datos_sensibles')
        .upsert({
          empleado_id: upload.empleado_id,
          face_descriptor: detection.descriptor,
        }, {
          onConflict: 'empleado_id'
        });

      if (updateError) throw updateError;

      // Registrar la nueva versión en empleados_rostros
      const { error: rostroError } = await supabase
        .from('empleados_rostros')
        .insert({
          empleado_id: upload.empleado_id,
          face_descriptor: detection.descriptor,
          version_name: versionName,
          is_active: true,
          confidence_score: detection.score,
        });
      if (rostroError) throw rostroError;

      // Obtener el empleado actual (para cumplir FK de revisado_por)
      const { data: currentUser } = await supabase.auth.getUser()
      const currentUserId = currentUser.user?.id
      const { data: empleadoReviewer } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('activo', true)
        .single()

      // Actualizar estado de la foto
      const { error: approveError } = await supabase
        .from('facial_photo_uploads')
        .update({
          estado: 'aprobado',
          revisado_por: empleadoReviewer?.id ?? null,
          fecha_revision: new Date().toISOString(),
          comentarios: comentarios[upload.id] || null,
        })
        .eq('id', upload.id);

      if (approveError) throw approveError;

      const versionMessage = versionNumber > 1 
        ? `Se guardó como ${versionName}` 
        : 'El reconocimiento facial ha sido activado';

      toast({
        title: 'Foto aprobada',
        description: versionMessage,
      });

      await loadUploads();
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error al aprobar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (uploadId: string) => {
    if (!comentarios[uploadId]) {
      toast({
        title: 'Comentario requerido',
        description: 'Debes indicar el motivo del rechazo',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(uploadId);

    try {
      const { error } = await supabase
        .from('facial_photo_uploads')
        .update({
          estado: 'rechazado',
          revisado_por: (await supabase.auth.getUser()).data.user?.id,
          fecha_revision: new Date().toISOString(),
          comentarios: comentarios[uploadId],
        })
        .eq('id', uploadId);

      if (error) throw error;

      toast({
        title: 'Foto rechazada',
        description: 'Se ha notificado al empleado',
      });

      await loadUploads();
    } catch (error: any) {
      toast({
        title: 'Error al rechazar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  const filterByEstado = (estado: string) => {
    return uploads.filter((u) => u.estado === estado);
  };

  const renderUploadCard = (upload: PhotoUpload) => {
    const detection = faceDetectionResults[upload.id];
    
    return (
      <Card key={upload.id}>
        <CardHeader>
          <CardTitle className="text-base">
            {upload.empleados.nombre} {upload.empleados.apellido}
          </CardTitle>
          <CardDescription>{upload.empleados.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <img
              src={upload.photo_url}
              alt="Foto facial"
              className="w-full rounded-lg"
              crossOrigin="anonymous"
            />
            <canvas
              ref={(el) => (canvasRefs.current[upload.id] = el)}
              className="absolute top-0 left-0 w-full h-full"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            Subida el {new Date(upload.created_at).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>

          {upload.estado === 'pendiente' && (
            <>
              {!detection && (
                <Button
                  onClick={() => detectFace(upload.id, upload.photo_url)}
                  variant="outline"
                  className="w-full"
                  disabled={!modelsLoaded}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Verificar Detección Facial
                </Button>
              )}

              {detection && !detection.detected && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No se detectó ningún rostro en la imagen. Solicita al empleado que suba una nueva foto.
                  </AlertDescription>
                </Alert>
              )}

              {detection && detection.detected && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Rostro detectado correctamente (Confianza: {(detection.score * 100).toFixed(1)}%)
                  </AlertDescription>
                </Alert>
              )}

              <Textarea
                placeholder="Comentarios (opcional para aprobación, requerido para rechazo)"
                value={comentarios[upload.id] || ''}
                onChange={(e) =>
                  setComentarios((prev) => ({ ...prev, [upload.id]: e.target.value }))
                }
              />

              <div className="flex gap-2">
                <Button
                  onClick={() => handleApprove(upload)}
                  disabled={processing === upload.id || !detection?.detected}
                  className="flex-1"
                >
                  {processing === upload.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Aprobar
                </Button>
                <Button
                  onClick={() => handleReject(upload.id)}
                  disabled={processing === upload.id}
                  variant="destructive"
                  className="flex-1"
                >
                  {processing === upload.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Rechazar
                </Button>
              </div>
            </>
          )}

          {upload.estado !== 'pendiente' && (
            <div className="space-y-2">
              <Badge
                variant={upload.estado === 'aprobado' ? 'default' : 'destructive'}
                className="w-full justify-center"
              >
                {upload.estado === 'aprobado' ? 'Aprobado' : 'Rechazado'}
              </Badge>
              {upload.comentarios && (
                <p className="text-sm text-muted-foreground">{upload.comentarios}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Aprobación de Fotos Faciales</CardTitle>
          <CardDescription>
            Revisa y aprueba las fotos subidas por los empleados para el reconocimiento facial
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="pendiente">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pendiente">
            Pendientes ({filterByEstado('pendiente').length})
          </TabsTrigger>
          <TabsTrigger value="aprobado">
            Aprobadas ({filterByEstado('aprobado').length})
          </TabsTrigger>
          <TabsTrigger value="rechazado">
            Rechazadas ({filterByEstado('rechazado').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendiente" className="space-y-4">
          {filterByEstado('pendiente').length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No hay fotos pendientes de revisión
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filterByEstado('pendiente').map(renderUploadCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="aprobado" className="space-y-4">
          {filterByEstado('aprobado').length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No hay fotos aprobadas
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filterByEstado('aprobado').map(renderUploadCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rechazado" className="space-y-4">
          {filterByEstado('rechazado').length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No hay fotos rechazadas
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filterByEstado('rechazado').map(renderUploadCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
