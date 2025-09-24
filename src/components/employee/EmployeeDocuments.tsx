import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, CheckCircle, Clock, ExternalLink, Eye } from "lucide-react";

interface DocumentoAsignado {
  id: string;
  documento_id: string;
  fecha_asignacion: string;
  fecha_limite_lectura: string | null;
  documento: {
    titulo: string;
    descripcion: string;
    contenido: string;
    url_archivo: string;
    tipo_documento: string;
  } | null;
  confirmacion: {
    fecha_confirmacion: string;
  }[];
}

interface Props {
  empleadoId: string;
}

export function EmployeeDocuments({ empleadoId }: Props) {
  const [documentos, setDocumentos] = useState<DocumentoAsignado[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentoAsignado | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (empleadoId) {
      loadDocumentos();
    }
  }, [empleadoId]);

  const loadDocumentos = async () => {
    setLoading(true);
    try {
      const { data: asignaciones, error } = await supabase
        .from('asignaciones_documentos_obligatorios')
        .select('*')
        .eq('empleado_id', empleadoId)
        .eq('activa', true);

      if (error) throw error;

      // Load related data for each assignment
      const documentosWithRelatedData = await Promise.all(
        (asignaciones || []).map(async (asignacion) => {
          // Load documento
          const { data: documento } = await supabase
            .from('documentos_obligatorios')
            .select('titulo, descripcion, contenido, url_archivo, tipo_documento')
            .eq('id', asignacion.documento_id)
            .maybeSingle();

          // Load confirmaciones
          const { data: confirmaciones } = await supabase
            .from('confirmaciones_lectura')
            .select('fecha_confirmacion')
            .eq('asignacion_id', asignacion.id);

          return {
            ...asignacion,
            documento: documento || null,
            confirmacion: confirmaciones || []
          };
        })
      );

      setDocumentos(documentosWithRelatedData);
    } catch (error) {
      console.error('Error loading documentos:', error);
      toast({
        title: "Error",
        description: "Error al cargar documentos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReading = async (asignacionId: string, documentoId: string) => {
    try {
      const { error } = await supabase
        .from('confirmaciones_lectura')
        .insert([{
          asignacion_id: asignacionId,
          empleado_id: empleadoId,
          documento_id: documentoId
        }]);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Lectura confirmada correctamente"
      });
      loadDocumentos();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error confirming reading:', error);
      toast({
        title: "Error",
        description: "Error al confirmar lectura",
        variant: "destructive"
      });
    }
  };

  const openDocument = (doc: DocumentoAsignado) => {
    setSelectedDoc(doc);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p>Cargando documentos...</p>
        </CardContent>
      </Card>
    );
  }

  const pendientes = documentos.filter(d => d?.confirmacion?.length === 0);
  const confirmados = documentos.filter(d => d?.confirmacion?.length > 0);

  return (
    <div className="space-y-4">
      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="text-center p-2 bg-accent rounded">
          <div className="font-bold text-lg">{documentos.length}</div>
          <div className="text-muted-foreground">Total</div>
        </div>
        <div className="text-center p-2 bg-destructive/10 rounded">
          <div className="font-bold text-lg text-destructive">{pendientes.length}</div>
          <div className="text-muted-foreground">Pendientes</div>
        </div>
        <div className="text-center p-2 bg-primary/10 rounded">
          <div className="font-bold text-lg text-primary">{confirmados.length}</div>
          <div className="text-muted-foreground">Leídos</div>
        </div>
      </div>

      {/* Documentos pendientes */}
      {pendientes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-destructive flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pendientes de Lectura
          </h4>
          {pendientes.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-destructive/5">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{doc.documento?.titulo || 'Sin título'}</span>
                  <Badge variant="outline">{doc.documento?.tipo_documento || 'Documento'}</Badge>
                  <Badge variant="destructive" className="text-xs">Pendiente</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{doc.documento?.descripcion || 'Sin descripción'}</p>
                <div className="text-xs text-muted-foreground">
                  Asignado: {new Date(doc.fecha_asignacion).toLocaleDateString()}
                  {doc.fecha_limite_lectura && (
                    <span className="ml-4">
                      Límite: {new Date(doc.fecha_limite_lectura).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <Button size="sm" onClick={() => openDocument(doc)}>
                <Eye className="h-3 w-3 mr-1" />
                Leer
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Documentos confirmados */}
      {confirmados.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-primary flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Documentos Leídos
          </h4>
          {confirmados.slice(0, 3).map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-primary/5">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{doc.documento?.titulo || 'Sin título'}</span>
                  <Badge variant="outline">{doc.documento?.tipo_documento || 'Documento'}</Badge>
                  <Badge className="text-xs">Leído</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Confirmado: {doc.confirmacion?.[0]?.fecha_confirmacion ? 
                    new Date(doc.confirmacion[0].fecha_confirmacion).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => openDocument(doc)}>
                <Eye className="h-3 w-3 mr-1" />
                Ver
              </Button>
            </div>
          ))}
          {confirmados.length > 3 && (
            <p className="text-xs text-muted-foreground text-center">
              Y {confirmados.length - 3} documentos más leídos
            </p>
          )}
        </div>
      )}

      {documentos.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay documentos asignados</p>
        </div>
      )}

      {/* Dialog para mostrar documento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedDoc?.documento?.titulo || 'Sin título'}
            </DialogTitle>
            <DialogDescription>
              {selectedDoc?.documento?.descripcion || 'Sin descripción'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto">
            {selectedDoc?.documento?.url_archivo && (
              <div className="flex items-center gap-2 p-2 bg-accent rounded">
                <ExternalLink className="h-4 w-4" />
                <a
                  href={selectedDoc.documento.url_archivo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Abrir archivo externo
                </a>
              </div>
            )}

            {selectedDoc?.documento?.contenido && (
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap p-4 border rounded-lg bg-background text-sm">
                  {selectedDoc.documento.contenido}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {!selectedDoc?.confirmacion || selectedDoc.confirmacion.length === 0 ? (
                  <span className="text-destructive">Pendiente de confirmación</span>
                ) : (
                  <span className="text-primary">
                    Confirmado el {selectedDoc.confirmacion?.[0]?.fecha_confirmacion ? 
                      new Date(selectedDoc.confirmacion[0].fecha_confirmacion).toLocaleString() : 'N/A'}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cerrar
                </Button>
                {(!selectedDoc?.confirmacion || selectedDoc.confirmacion.length === 0) && (
                  <Button onClick={() => selectedDoc && handleConfirmReading(selectedDoc.id, selectedDoc.documento_id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar Lectura
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}