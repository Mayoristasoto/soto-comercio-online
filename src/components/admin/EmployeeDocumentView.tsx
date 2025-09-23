import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, CheckCircle, Clock, ExternalLink } from "lucide-react";

interface DocumentoAsignado {
  id: string;
  documento_id: string;
  fecha_asignacion: string;
  fecha_limite_lectura: string;
  documento: {
    titulo: string;
    descripcion: string;
    contenido: string;
    url_archivo: string;
    tipo_documento: string;
  };
  confirmacion: {
    fecha_confirmacion: string;
  }[];
}

interface Props {
  empleadoId: string | null;
}

export function EmployeeDocumentView({ empleadoId }: Props) {
  const [documentos, setDocumentos] = useState<DocumentoAsignado[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentoAsignado | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (empleadoId) {
      loadDocumentos();
    }
  }, [empleadoId]);

  const loadDocumentos = async () => {
    if (!empleadoId) return;

    setLoading(true);
    try {
      const { data: asignaciones, error } = await supabase
        .from('asignaciones_documentos_obligatorios')
        .select('*')
        .eq('empleado_id', empleadoId)
        .eq('activa', true);

      if (error) throw error;

      // Load related data for each asignacion
      const documentosWithRelatedData = await Promise.all(
        (asignaciones || []).map(async (asignacion) => {
          // Load documento
          const { data: documento } = await supabase
            .from('documentos_obligatorios')
            .select('titulo, descripcion, contenido, url_archivo, tipo_documento')
            .eq('id', asignacion.documento_id)
            .single();

          // Load confirmaciones
          const { data: confirmaciones } = await supabase
            .from('confirmaciones_lectura')
            .select('fecha_confirmacion')
            .eq('asignacion_id', asignacion.id);

          return {
            ...asignacion,
            documento: documento || { titulo: '', descripcion: '', contenido: '', url_archivo: '', tipo_documento: '' },
            confirmacion: confirmaciones || []
          };
        })
      );

      setDocumentos(documentosWithRelatedData);
    } catch (error) {
      console.error('Error loading documentos:', error);
      toast.error('Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReading = async (asignacionId: string, documentoId: string) => {
    if (!empleadoId) return;

    try {
      const { error } = await supabase
        .from('confirmaciones_lectura')
        .insert([{
          asignacion_id: asignacionId,
          empleado_id: empleadoId,
          documento_id: documentoId
        }]);

      if (error) throw error;

      toast.success('Lectura confirmada correctamente');
      loadDocumentos();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error confirming reading:', error);
      toast.error('Error al confirmar lectura');
    }
  };

  const openDocument = (doc: DocumentoAsignado) => {
    setSelectedDoc(doc);
    setDialogOpen(true);
  };

  if (!empleadoId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Seleccione un empleado para ver sus documentos</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p>Cargando documentos...</p>
        </CardContent>
      </Card>
    );
  }

  const pendientes = documentos.filter(d => d.confirmacion.length === 0);
  const confirmados = documentos.filter(d => d.confirmacion.length > 0);

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Asignados</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{pendientes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{confirmados.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Documentos pendientes */}
      {pendientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Documentos Pendientes de Lectura</CardTitle>
            <CardDescription>
              Estos documentos requieren confirmación de lectura
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendientes.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{doc.documento.titulo}</h3>
                      <Badge variant="outline">{doc.documento.tipo_documento}</Badge>
                      <Badge variant="destructive">Pendiente</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {doc.documento.descripcion}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Asignado: {new Date(doc.fecha_asignacion).toLocaleDateString()}
                      {doc.fecha_limite_lectura && (
                        <span className="ml-4">
                          Límite: {new Date(doc.fecha_limite_lectura).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button onClick={() => openDocument(doc)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Leer Documento
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documentos confirmados */}
      {confirmados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Documentos Leídos</CardTitle>
            <CardDescription>
              Documentos con lectura confirmada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {confirmados.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg bg-accent/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{doc.documento.titulo}</h3>
                      <Badge variant="outline">{doc.documento.tipo_documento}</Badge>
                      <Badge>Confirmado</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {doc.documento.descripcion}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Confirmado: {new Date(doc.confirmacion[0].fecha_confirmacion).toLocaleString()}
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => openDocument(doc)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Documento
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {documentos.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">No hay documentos asignados</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog para mostrar documento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedDoc?.documento.titulo}
            </DialogTitle>
            <DialogDescription>
              {selectedDoc?.documento.descripcion}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto">
            {selectedDoc?.documento.url_archivo && (
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

            {selectedDoc?.documento.contenido && (
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap p-4 border rounded-lg bg-background">
                  {selectedDoc.documento.contenido}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedDoc?.confirmacion.length === 0 ? (
                  <span className="text-destructive">Pendiente de confirmación</span>
                ) : (
                  <span className="text-primary">
                    Confirmado el {new Date(selectedDoc.confirmacion[0].fecha_confirmacion).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cerrar
                </Button>
                {selectedDoc?.confirmacion.length === 0 && (
                  <Button onClick={() => handleConfirmReading(selectedDoc.id, selectedDoc.documento_id)}>
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