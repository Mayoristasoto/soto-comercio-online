import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { UserPlus, Users, Calendar, Search, FileText } from "lucide-react";

interface Empleado {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  puesto: string;
}

interface DocumentoObligatorio {
  id: string;
  titulo: string;
  tipo_documento: string;
}

interface Asignacion {
  id: string;
  documento_id: string;
  empleado_id: string;
  fecha_asignacion: string;
  fecha_limite_lectura: string;
  activa: boolean;
  documento: {
    titulo: string;
    tipo_documento: string;
  };
  empleado: {
    nombre: string;
    apellido: string;
    email: string;
  };
  confirmacion: {
    fecha_confirmacion: string;
  }[];
  firmas: {
    fecha_firma: string;
  }[];
}

export function DocumentAssignments() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoObligatorio[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDocumento, setSelectedDocumento] = useState("");
  const [selectedEmpleados, setSelectedEmpleados] = useState<string[]>([]);
  const [fechaLimite, setFechaLimite] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedAsignacion, setSelectedAsignacion] = useState<Asignacion | null>(null);
  const [firmaData, setFirmaData] = useState<{ firma_imagen: string; fecha_firma: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load empleados
      const { data: empleadosData, error: empleadosError } = await supabase
        .from('empleados')
        .select('id, nombre, apellido, email, puesto')
        .eq('activo', true);

      if (empleadosError) throw empleadosError;

      // Load documentos
      const { data: documentosData, error: documentosError } = await supabase
        .from('documentos_obligatorios')
        .select('id, titulo, tipo_documento')
        .eq('activo', true);

      if (documentosError) throw documentosError;

      // Load asignaciones
      const { data: asignacionesData, error: asignacionesError } = await supabase
        .from('asignaciones_documentos_obligatorios')
        .select('*')
        .eq('activa', true);

      if (asignacionesError) throw asignacionesError;

      // Load related data for each asignacion
      const asignacionesWithRelatedData = await Promise.all(
        (asignacionesData || []).map(async (asignacion) => {
          // Load documento
          const { data: documento } = await supabase
            .from('documentos_obligatorios')
            .select('titulo, tipo_documento')
            .eq('id', asignacion.documento_id)
            .single();

          // Load empleado
          const { data: empleado } = await supabase
            .from('empleados')
            .select('nombre, apellido, email')
            .eq('id', asignacion.empleado_id)
            .single();

          // Load confirmaciones
          const { data: confirmaciones } = await supabase
            .from('confirmaciones_lectura')
            .select('fecha_confirmacion')
            .eq('asignacion_id', asignacion.id);

          // Load firmas
          const { data: firmas } = await supabase
            .from('documentos_firmas')
            .select('fecha_firma')
            .eq('documento_id', asignacion.documento_id)
            .eq('empleado_id', asignacion.empleado_id);

          return {
            ...asignacion,
            documento: documento || { titulo: '', tipo_documento: '' },
            empleado: empleado || { nombre: '', apellido: '', email: '' },
            confirmacion: confirmaciones || [],
            firmas: firmas || []
          };
        })
      );

      setEmpleados(empleadosData || []);
      setDocumentos(documentosData || []);
      setAsignaciones(asignacionesWithRelatedData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedDocumento || selectedEmpleados.length === 0) {
      toast.error('Seleccione un documento y al menos un empleado');
      return;
    }

    try {
      // Get current empleado ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: empleado } = await supabase
        .from('empleados')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!empleado) throw new Error('Empleado no encontrado');

      const assignments = selectedEmpleados.map(empleadoId => ({
        documento_id: selectedDocumento,
        empleado_id: empleadoId,
        fecha_limite_lectura: fechaLimite || null,
        asignado_por: empleado.id
      }));

      const { error } = await supabase
        .from('asignaciones_documentos_obligatorios')
        .insert(assignments);

      if (error) throw error;

      toast.success(`Documento asignado a ${selectedEmpleados.length} empleado(s)`);
      setDialogOpen(false);
      setSelectedDocumento("");
      setSelectedEmpleados([]);
      setFechaLimite("");
      loadData();
    } catch (error: any) {
      console.error('Error assigning document:', error);
      toast.error('Error al asignar documento');
    }
  };

  const handleEmployeeToggle = (empleadoId: string) => {
    setSelectedEmpleados(prev => 
      prev.includes(empleadoId)
        ? prev.filter(id => id !== empleadoId)
        : [...prev, empleadoId]
    );
  };

  const handleViewSignedDocument = async (asignacion: Asignacion) => {
    if (asignacion.firmas.length === 0) return;

    try {
      // Get firma data
      const { data: firmaDoc, error: firmaError } = await supabase
        .from('documentos_firmas')
        .select('firma_id, fecha_firma')
        .eq('documento_id', asignacion.documento_id)
        .eq('empleado_id', asignacion.empleado_id)
        .single();

      if (firmaError) throw firmaError;

      // Get firma image
      const { data: firmaImg, error: imgError } = await supabase
        .from('empleados_firmas')
        .select('firma_data')
        .eq('id', firmaDoc.firma_id)
        .single();

      if (imgError) throw imgError;

      setFirmaData({
        firma_imagen: firmaImg.firma_data,
        fecha_firma: firmaDoc.fecha_firma
      });
      setSelectedAsignacion(asignacion);
      setPreviewDialogOpen(true);
    } catch (error) {
      console.error('Error loading signature:', error);
      toast.error('Error al cargar la firma');
    }
  };

  const filteredEmpleados = empleados.filter(emp =>
    emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAsignaciones = asignaciones.filter(asig =>
    asig.documento.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asig.empleado.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asig.empleado.apellido.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center items-center h-64">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Asignación de Documentos</h2>
          <p className="text-muted-foreground">Asigna documentos obligatorios a empleados</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Nueva Asignación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Asignar Documento</DialogTitle>
              <DialogDescription>
                Seleccione un documento y los empleados que deben leerlo
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="documento">Documento</Label>
                  <Select value={selectedDocumento} onValueChange={setSelectedDocumento}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un documento" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentos.map(doc => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.titulo} ({doc.tipo_documento})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fecha_limite">Fecha límite (opcional)</Label>
                  <Input
                    id="fecha_limite"
                    type="date"
                    value={fechaLimite}
                    onChange={(e) => setFechaLimite(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label>Empleados</Label>
                  <Badge variant="outline">
                    {selectedEmpleados.length} seleccionado(s)
                  </Badge>
                </div>
                
                <div className="relative mb-2">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder="Buscar empleados..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="border rounded-lg max-h-60 overflow-y-auto p-2">
                  {filteredEmpleados.map(empleado => (
                    <div key={empleado.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
                      <Checkbox
                        id={empleado.id}
                        checked={selectedEmpleados.includes(empleado.id)}
                        onCheckedChange={() => handleEmployeeToggle(empleado.id)}
                      />
                      <Label htmlFor={empleado.id} className="flex-1 cursor-pointer">
                        <div>
                          <div className="font-medium">{empleado.nombre} {empleado.apellido}</div>
                          <div className="text-sm text-muted-foreground">{empleado.email}</div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAssign}>
                  Asignar Documento
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Asignaciones</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{asignaciones.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {asignaciones.filter(a => a.confirmacion.length === 0).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Firmadas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {asignaciones.filter(a => a.firmas.length > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de asignaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Asignaciones Activas</CardTitle>
          <CardDescription>
            Lista de documentos asignados a empleados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Buscar asignaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Asignado</TableHead>
                <TableHead>Límite</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Confirmado</TableHead>
                <TableHead>Firmado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAsignaciones.map((asignacion) => (
                <TableRow key={asignacion.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{asignacion.documento.titulo}</div>
                      <Badge variant="outline" className="mt-1">
                        {asignacion.documento.tipo_documento}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {asignacion.empleado.nombre} {asignacion.empleado.apellido}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {asignacion.empleado.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(asignacion.fecha_asignacion).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {asignacion.fecha_limite_lectura
                      ? new Date(asignacion.fecha_limite_lectura).toLocaleDateString()
                      : 'Sin límite'
                    }
                  </TableCell>
                  <TableCell>
                    <Badge variant={asignacion.confirmacion.length > 0 ? "default" : "destructive"}>
                      {asignacion.confirmacion.length > 0 ? "Leído" : "Pendiente"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {asignacion.confirmacion.length > 0
                      ? new Date(asignacion.confirmacion[0].fecha_confirmacion).toLocaleDateString()
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    {asignacion.firmas.length > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewSignedDocument(asignacion)}
                        className="flex items-center gap-2"
                      >
                        <Badge variant="default">Firmado</Badge>
                        <FileText className="h-4 w-4" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(asignacion.firmas[0].fecha_firma).toLocaleDateString()}
                        </span>
                      </Button>
                    ) : (
                      <Badge variant="outline">Sin firmar</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Documento Firmado</DialogTitle>
            <DialogDescription>
              Vista previa del documento y firma digital del empleado
            </DialogDescription>
          </DialogHeader>

          {selectedAsignacion && (
            <div className="space-y-6">
              {/* Document Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{selectedAsignacion.documento.titulo}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    Empleado: {selectedAsignacion.empleado.nombre} {selectedAsignacion.empleado.apellido}
                  </span>
                  <Badge variant="outline">{selectedAsignacion.documento.tipo_documento}</Badge>
                </div>
              </div>

              {/* Document Preview - TODO: Load actual document */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Vista Previa del Documento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-lg p-4 text-center text-muted-foreground">
                    <p>Vista previa del documento aquí</p>
                    <p className="text-xs mt-2">
                      El documento se puede visualizar si tiene una URL configurada
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Signature Section */}
              {firmaData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Firma Digital del Empleado</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border rounded-lg p-4 bg-background">
                      <img
                        src={firmaData.firma_imagen}
                        alt="Firma del empleado"
                        className="max-w-md mx-auto"
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Fecha y hora de firma:</span>
                      <Badge variant="secondary">
                        {new Date(firmaData.fecha_firma).toLocaleString('es-AR', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}