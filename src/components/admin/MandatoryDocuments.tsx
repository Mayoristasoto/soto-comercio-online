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
import { toast } from "sonner";
import { FileText, Plus, Edit, Trash2, Users, CheckCircle } from "lucide-react";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingDoc) {
        const { error } = await supabase
          .from('documentos_obligatorios')
          .update(formData)
          .eq('id', editingDoc.id);

        if (error) throw error;
        toast.success('Documento actualizado correctamente');
      } else {
        const { error } = await supabase
          .from('documentos_obligatorios')
          .insert([formData]);

        if (error) throw error;
        toast.success('Documento creado correctamente');
      }

      setDialogOpen(false);
      setEditingDoc(null);
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
                <Label htmlFor="url_archivo">URL del Archivo</Label>
                <Input
                  id="url_archivo"
                  type="url"
                  value={formData.url_archivo}
                  onChange={(e) => setFormData({ ...formData, url_archivo: e.target.value })}
                  placeholder="https://..."
                />
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
                    <TableCell>{stat?.total_asignados || 0}</TableCell>
                    <TableCell>{stat?.total_confirmados || 0}</TableCell>
                    <TableCell>
                      <Badge variant={stat?.pendientes === 0 ? "default" : "destructive"}>
                        {stat?.pendientes || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
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