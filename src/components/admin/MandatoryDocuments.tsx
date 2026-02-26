import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { FileText, Plus, Edit, Trash2, Users, CheckCircle, Upload, Eye, X, Loader2 } from "lucide-react";

interface DocumentoObligatorio {
  id: string;
  titulo: string;
  descripcion: string;
  contenido: string;
  url_archivo: string;
  tipo_documento: string;
  activo: boolean;
  fecha_vigencia_desde: string;
  fecha_vigencia_hasta: string;
  created_at: string;
}

interface DocumentoStats {
  documento_id: string;
  titulo: string;
  total_asignados: number;
  total_confirmados: number;
  pendientes: number;
}

export function MandatoryDocuments() {
  const [documentos, setDocumentos] = useState<DocumentoObligatorio[]>([]);
  const [stats, setStats] = useState<DocumentoStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentoObligatorio | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [employeeDetailsMap, setEmployeeDetailsMap] = useState<Record<string, { names: string[]; loading: boolean }>>({});
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    contenido: "",
    url_archivo: "",
    tipo_documento: "procedimiento",
    fecha_vigencia_desde: "",
    fecha_vigencia_hasta: ""
  });

  useEffect(() => {
    loadDocumentos();
    loadStats();
  }, []);

  const loadDocumentos = async () => {
    try {
      const { data, error } = await supabase
        .from('documentos_obligatorios')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocumentos(data || []);
    } catch (error) {
      console.error('Error loading documentos:', error);
      toast.error('Error al cargar documentos');
    }
  };

  const loadStats = async () => {
    try {
      // Load stats using separate queries
      const { data: documentos, error: docError } = await supabase
        .from('documentos_obligatorios')
        .select('id, titulo')
        .eq('activo', true);

      if (docError) throw docError;

      const statsPromises = documentos?.map(async (doc) => {
        const { data: asignaciones } = await supabase
          .from('asignaciones_documentos_obligatorios')
          .select('id')
          .eq('documento_id', doc.id)
          .eq('activa', true);

        const { data: confirmaciones } = await supabase
          .from('confirmaciones_lectura')
          .select('id')
          .eq('documento_id', doc.id);

        const totalAsignados = asignaciones?.length || 0;
        const totalConfirmados = confirmaciones?.length || 0;

        return {
          documento_id: doc.id,
          titulo: doc.titulo,
          total_asignados: totalAsignados,
          total_confirmados: totalConfirmados,
          pendientes: totalAsignados - totalConfirmados
        };
      }) || [];

      const statsData = await Promise.all(statsPromises);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeDetails = async (documentoId: string, category: 'asignados' | 'confirmados' | 'pendientes') => {
    const key = `${documentoId}-${category}`;
    setEmployeeDetailsMap(prev => ({ ...prev, [key]: { names: [], loading: true } }));
    try {
      let names: string[] = [];
      if (category === 'asignados' || category === 'pendientes') {
        const { data: asignaciones } = await supabase
          .from('asignaciones_documentos_obligatorios')
          .select('empleado_id')
          .eq('documento_id', documentoId)
          .eq('activa', true);
        const empleadoIds = asignaciones?.map(a => a.empleado_id) || [];

        if (category === 'asignados') {
          if (empleadoIds.length > 0) {
            const { data: empleados } = await supabase.from('empleados').select('nombre, apellido').in('id', empleadoIds);
            names = empleados?.map(e => `${e.nombre} ${e.apellido}`) || [];
          }
        } else {
          const { data: confirmaciones } = await supabase.from('confirmaciones_lectura').select('empleado_id').eq('documento_id', documentoId);
          const confirmadoIds = new Set(confirmaciones?.map(c => c.empleado_id) || []);
          const pendienteIds = empleadoIds.filter(id => !confirmadoIds.has(id));
          if (pendienteIds.length > 0) {
            const { data: empleados } = await supabase.from('empleados').select('nombre, apellido').in('id', pendienteIds);
            names = empleados?.map(e => `${e.nombre} ${e.apellido}`) || [];
          }
        }
      } else {
        const { data: confirmaciones } = await supabase.from('confirmaciones_lectura').select('empleado_id').eq('documento_id', documentoId);
        const empleadoIds = confirmaciones?.map(c => c.empleado_id) || [];
        if (empleadoIds.length > 0) {
          const { data: empleados } = await supabase.from('empleados').select('nombre, apellido').in('id', empleadoIds);
          names = empleados?.map(e => `${e.nombre} ${e.apellido}`) || [];
        }
      }
      setEmployeeDetailsMap(prev => ({ ...prev, [key]: { names, loading: false } }));
    } catch (error) {
      console.error('Error loading employee details:', error);
      setEmployeeDetailsMap(prev => ({ ...prev, [key]: { names: [], loading: false } }));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!validTypes.includes(file.type)) {
      toast.error('Solo se permiten archivos PDF o Word');
      return;
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no debe superar 10MB');
      return;
    }

    setSelectedFile(file);
    
    // Generar previsualización para PDF
    if (file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return null;

    setUploadingFile(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `mandatory-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('mandatory-documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('mandatory-documents')
        .getPublicUrl(filePath);

      toast.success('Archivo subido correctamente');
      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error al subir archivo');
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormData({ ...formData, url_archivo: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Subir archivo si hay uno seleccionado
      let fileUrl = formData.url_archivo;
      if (selectedFile) {
        const uploadedUrl = await handleFileUpload();
        if (uploadedUrl) {
          fileUrl = uploadedUrl;
        }
      }

      const dataToSave = { ...formData, url_archivo: fileUrl };

      if (editingDoc) {
        const { error } = await supabase
          .from('documentos_obligatorios')
          .update(dataToSave)
          .eq('id', editingDoc.id);

        if (error) throw error;
        toast.success('Documento actualizado correctamente');
      } else {
        const { error } = await supabase
          .from('documentos_obligatorios')
          .insert([dataToSave]);

        if (error) throw error;
        toast.success('Documento creado correctamente');
      }

      setDialogOpen(false);
      setEditingDoc(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      setFormData({
        titulo: "",
        descripcion: "",
        contenido: "",
        url_archivo: "",
        tipo_documento: "procedimiento",
        fecha_vigencia_desde: "",
        fecha_vigencia_hasta: ""
      });
      loadDocumentos();
      loadStats();
    } catch (error) {
      console.error('Error saving documento:', error);
      toast.error('Error al guardar documento');
    }
  };

  const handleEdit = (doc: DocumentoObligatorio) => {
    setEditingDoc(doc);
    setSelectedFile(null);
    setPreviewUrl(doc.url_archivo && doc.url_archivo.endsWith('.pdf') ? doc.url_archivo : null);
    setFormData({
      titulo: doc.titulo,
      descripcion: doc.descripcion || "",
      contenido: doc.contenido || "",
      url_archivo: doc.url_archivo || "",
      tipo_documento: doc.tipo_documento,
      fecha_vigencia_desde: doc.fecha_vigencia_desde || "",
      fecha_vigencia_hasta: doc.fecha_vigencia_hasta || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este documento?')) return;

    try {
      const { error } = await supabase
        .from('documentos_obligatorios')
        .update({ activo: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('Documento desactivado');
      loadDocumentos();
      loadStats();
    } catch (error) {
      console.error('Error deleting documento:', error);
      toast.error('Error al desactivar documento');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Documentos Obligatorios</h2>
          <p className="text-muted-foreground">Gestiona documentos de lectura obligatoria para empleados</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingDoc(null);
              setSelectedFile(null);
              setPreviewUrl(null);
              setFormData({
                titulo: "",
                descripcion: "",
                contenido: "",
                url_archivo: "",
                tipo_documento: "procedimiento",
                fecha_vigencia_desde: "",
                fecha_vigencia_hasta: ""
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingDoc ? 'Editar Documento' : 'Nuevo Documento'}
              </DialogTitle>
              <DialogDescription>
                Configure los datos del documento obligatorio
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="titulo">Título</Label>
                  <Input
                    id="titulo"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tipo_documento">Tipo</Label>
                  <Select
                    value={formData.tipo_documento}
                    onValueChange={(value) => setFormData({ ...formData, tipo_documento: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="procedimiento">Procedimiento</SelectItem>
                      <SelectItem value="reglamento">Reglamento</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="politica">Política</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="contenido">Contenido</Label>
                <Textarea
                  id="contenido"
                  value={formData.contenido}
                  onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
                  rows={5}
                  placeholder="Contenido del documento (opcional si se proporciona URL)"
                />
              </div>

              <div>
                <Label>Archivo del Documento</Label>
                <div className="space-y-3">
                  {/* Opción 1: URL Externa (Google Drive, etc) */}
                  <div className="space-y-2">
                    <Label htmlFor="url_archivo" className="text-sm font-medium">
                      URL Externa (Google Drive, Dropbox, etc.)
                    </Label>
                    <Input
                      id="url_archivo"
                      type="url"
                      placeholder="https://drive.google.com/file/d/..."
                      value={formData.url_archivo}
                      onChange={(e) => {
                        setFormData({ ...formData, url_archivo: e.target.value });
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Para Google Drive: Compartir → Cualquiera con el enlace → Copiar enlace
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">O</span>
                    </div>
                  </div>

                  {/* Opción 2: Subir archivo a Supabase */}
                  {!selectedFile && !formData.url_archivo && (
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Haz clic para subir un archivo PDF o Word
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Máximo 10MB
                        </span>
                      </label>
                    </div>
                  )}

                  {(selectedFile || (formData.url_archivo && !formData.url_archivo.includes('drive.google.com'))) && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-sm font-medium">
                              {selectedFile ? selectedFile.name : 'Archivo de Supabase'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {selectedFile 
                                ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                                : 'Alojado en Supabase'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {formData.url_archivo && !selectedFile && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(formData.url_archivo, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveFile}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {previewUrl && (
                        <div className="border rounded-lg overflow-hidden">
                          <iframe
                            src={previewUrl}
                            className="w-full h-96"
                            title="Vista previa del documento"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {formData.url_archivo && formData.url_archivo.includes('drive.google.com') && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-sm font-medium">Archivo de Google Drive</p>
                            <p className="text-xs text-muted-foreground">Enlazado externamente</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(formData.url_archivo, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData({ ...formData, url_archivo: "" })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha_vigencia_desde">Vigente desde</Label>
                  <Input
                    id="fecha_vigencia_desde"
                    type="date"
                    value={formData.fecha_vigencia_desde}
                    onChange={(e) => setFormData({ ...formData, fecha_vigencia_desde: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="fecha_vigencia_hasta">Vigente hasta</Label>
                  <Input
                    id="fecha_vigencia_hasta"
                    type="date"
                    value={formData.fecha_vigencia_hasta}
                    onChange={(e) => setFormData({ ...formData, fecha_vigencia_hasta: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingDoc ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentos.filter(d => d.activo).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Asignaciones</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.reduce((acc, stat) => acc + stat.total_asignados, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lecturas Confirmadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.reduce((acc, stat) => acc + stat.total_confirmados, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de documentos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Documentos</CardTitle>
          <CardDescription>
            Documentos obligatorios creados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Asignados</TableHead>
                <TableHead>Confirmados</TableHead>
                <TableHead>Pendientes</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos.filter(doc => doc.activo).map((doc) => {
                const stat = stats.find(s => s.documento_id === doc.id);
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.titulo}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {doc.tipo_documento}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={doc.activo ? "default" : "secondary"}>
                        {doc.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                     <TableCell>
                      {(() => { const details = employeeDetailsMap[`${doc.id}-asignados`]; return (
                      <Popover onOpenChange={(open) => { if (open) loadEmployeeDetails(doc.id, 'asignados'); }}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-auto p-1 font-medium hover:underline">
                            {stat?.total_asignados || 0}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm">Empleados Asignados</h4>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  const tabEl = document.querySelector('[data-value="assignments"]') as HTMLElement;
                                  if (tabEl) tabEl.click();
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            {details?.loading ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</div>
                            ) : !details || details.names.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Sin asignaciones</p>
                            ) : (
                              <ul className="space-y-1 max-h-48 overflow-y-auto">
                                {details.names.map((name, i) => (
                                  <li key={i} className="text-sm flex items-center gap-1"><Users className="h-3 w-3 text-muted-foreground" />{name}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                      ); })()}
                    </TableCell>
                    <TableCell>
                      {(() => { const details = employeeDetailsMap[`${doc.id}-confirmados`]; return (
                      <Popover onOpenChange={(open) => { if (open) loadEmployeeDetails(doc.id, 'confirmados'); }}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-auto p-1 font-medium hover:underline">
                            {stat?.total_confirmados || 0}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Empleados Confirmados</h4>
                            {details?.loading ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</div>
                            ) : !details || details.names.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Sin confirmaciones</p>
                            ) : (
                              <ul className="space-y-1 max-h-48 overflow-y-auto">
                                {details.names.map((name, i) => (
                                  <li key={i} className="text-sm flex items-center gap-1"><CheckCircle className="h-3 w-3 text-muted-foreground" />{name}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                      ); })()}
                    </TableCell>
                    <TableCell>
                      {(() => { const details = employeeDetailsMap[`${doc.id}-pendientes`]; return (
                      <Popover onOpenChange={(open) => { if (open) loadEmployeeDetails(doc.id, 'pendientes'); }}>
                        <PopoverTrigger asChild>
                          <Badge variant={stat?.pendientes === 0 ? "default" : "destructive"} className="cursor-pointer hover:opacity-80">
                            {stat?.pendientes || 0}
                          </Badge>
                        </PopoverTrigger>
                        <PopoverContent className="w-64">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Empleados Pendientes</h4>
                            {details?.loading ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</div>
                            ) : !details || details.names.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Sin pendientes</p>
                            ) : (
                              <ul className="space-y-1 max-h-48 overflow-y-auto">
                                {details.names.map((name, i) => (
                                  <li key={i} className="text-sm flex items-center gap-1"><X className="h-3 w-3 text-destructive" />{name}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                      ); })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {doc.url_archivo && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(doc.url_archivo, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(doc)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}