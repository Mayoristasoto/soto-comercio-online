import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Save,
  Eye,
  Copy,
  FileText,
  Plus,
  Trash2,
  CopyPlus,
} from "lucide-react";
import {
  VARIABLES_DISPONIBLES,
  aplicarVariables,
} from "@/utils/constanciaVacacionesPDF";

interface Plantilla {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  contenido_html: string;
  ciudad_default: string;
  categoria: string;
  tipo_elemento: string | null;
  es_sistema: boolean;
  variables_extra: string[];
  activa: boolean;
}

const CATEGORIAS: { value: string; label: string }[] = [
  { value: "vacaciones", label: "Vacaciones" },
  { value: "entregas", label: "Entregas / Uniformes" },
  { value: "sanciones", label: "Sanciones" },
  { value: "notas", label: "Notas / Constancias" },
  { value: "otros", label: "Otros" },
];

const SAMPLE_DATA = {
  empleado: {
    nombre: "Juan",
    apellido: "Pérez",
    dni: "30123456",
    legajo: "L-001",
    puesto: "Vendedor",
    sucursal: "Sucursal Centro",
  },
  solicitud: {
    id: "sample-id",
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_fin: new Date(Date.now() + 1000 * 60 * 60 * 24 * 13)
      .toISOString()
      .slice(0, 10),
  },
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

const DEFAULT_HTML_BY_CAT: Record<string, string> = {
  entregas:
    "<p>{{ciudad}}, {{fecha_hoy}}.</p><p>Por la presente <strong>{{empleado}}</strong> deja constancia de haber recibido <strong>{{item}}</strong> (cantidad: {{cantidad}}, talla: {{talla}}).</p><p>Observaciones: {{observaciones}}</p>",
  sanciones:
    "<p>{{ciudad}}, {{fecha_hoy}}.</p><p>Se notifica a {{empleado}} de la siguiente medida: {{sancion}}. Motivo: {{motivo}}.</p>",
  notas:
    "<p>{{ciudad}}, {{fecha_hoy}}.</p><p>Por la presente se deja constancia que {{empleado}} (DNI {{dni}}) trabaja en esta empresa como {{puesto}} en {{sucursal}}.</p>",
  vacaciones:
    "<p>{{ciudad}}, {{fecha_hoy}}.</p><p>Se otorgan vacaciones a {{empleado}} desde el {{fecha_inicio}} hasta el {{fecha_fin}} ({{dias}} días). Reintegro: {{fecha_reintegro}}.</p>",
  otros: "<p>{{ciudad}}, {{fecha_hoy}}.</p><p>Contenido del documento…</p>",
};

export function PlantillasDocumentosManager() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catActive, setCatActive] = useState<string>("vacaciones");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Plantilla | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newPlantilla, setNewPlantilla] = useState({
    nombre: "",
    categoria: "notas",
    tipo_elemento: "",
    descripcion: "",
  });

  const { toast } = useToast();

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("plantillas_documentos")
        .select("*")
        .order("categoria", { ascending: true })
        .order("nombre", { ascending: true });
      if (error) throw error;
      const rows: Plantilla[] = (data || []).map((r: any) => ({
        ...r,
        variables_extra: Array.isArray(r.variables_extra) ? r.variables_extra : [],
      }));
      setPlantillas(rows);
      if (rows.length && !selectedId) {
        const first = rows.find((r) => r.categoria === catActive) ?? rows[0];
        setSelectedId(first.id);
        setDraft(first);
        setCatActive(first.categoria);
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las plantillas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const seleccionar = (p: Plantilla) => {
    setSelectedId(p.id);
    setDraft(p);
  };

  const handleSave = async () => {
    if (!draft) return;
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        nombre: draft.nombre,
        descripcion: draft.descripcion,
        contenido_html: draft.contenido_html,
        ciudad_default: draft.ciudad_default,
        categoria: draft.categoria,
        tipo_elemento: draft.tipo_elemento,
        variables_extra: draft.variables_extra,
        activa: draft.activa,
        updated_by: user?.id ?? null,
      };
      const { error } = await (supabase as any)
        .from("plantillas_documentos")
        .update(payload)
        .eq("id", draft.id);
      if (error) throw error;
      toast({ title: "Plantilla guardada" });
      await cargar();
    } catch (e: any) {
      toast({ title: "Error al guardar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!draft || draft.es_sistema) return;
    if (!confirm(`¿Eliminar plantilla "${draft.nombre}"?`)) return;
    const { error } = await (supabase as any)
      .from("plantillas_documentos")
      .delete()
      .eq("id", draft.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Plantilla eliminada" });
    setDraft(null);
    setSelectedId(null);
    await cargar();
  };

  const handleDuplicate = async () => {
    if (!draft) return;
    const nuevoCodigo = `${draft.codigo}_copia_${Date.now().toString(36)}`;
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any)
      .from("plantillas_documentos")
      .insert({
        codigo: nuevoCodigo,
        nombre: `${draft.nombre} (copia)`,
        descripcion: draft.descripcion,
        contenido_html: draft.contenido_html,
        ciudad_default: draft.ciudad_default,
        categoria: draft.categoria,
        tipo_elemento: draft.tipo_elemento,
        variables_extra: draft.variables_extra,
        es_sistema: false,
        activa: true,
        updated_by: user?.id ?? null,
      })
      .select()
      .single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Plantilla duplicada" });
    await cargar();
    setSelectedId((data as any).id);
    setDraft(data as any);
  };

  const handleCreate = async () => {
    if (!newPlantilla.nombre.trim()) {
      toast({ title: "Nombre requerido", variant: "destructive" });
      return;
    }
    const codigo = `${newPlantilla.categoria}_${slugify(newPlantilla.nombre)}_${Date.now().toString(36)}`;
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any)
      .from("plantillas_documentos")
      .insert({
        codigo,
        nombre: newPlantilla.nombre.trim(),
        descripcion: newPlantilla.descripcion || null,
        contenido_html: DEFAULT_HTML_BY_CAT[newPlantilla.categoria] || DEFAULT_HTML_BY_CAT.otros,
        ciudad_default: "Mar del Plata",
        categoria: newPlantilla.categoria,
        tipo_elemento: newPlantilla.tipo_elemento || null,
        variables_extra: [],
        es_sistema: false,
        activa: true,
        updated_by: user?.id ?? null,
      })
      .select()
      .single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Plantilla creada" });
    setCreateOpen(false);
    setNewPlantilla({ nombre: "", categoria: "notas", tipo_elemento: "", descripcion: "" });
    await cargar();
    setCatActive((data as any).categoria);
    setSelectedId((data as any).id);
    setDraft(data as any);
  };

  const copyVar = (name: string) => {
    navigator.clipboard.writeText(`{{${name}}}`);
    toast({ title: `Variable copiada`, description: `{{${name}}}` });
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const porCategoria = plantillas.filter((p) => p.categoria === catActive);
  const extraSampleData = (draft?.variables_extra || []).reduce(
    (acc: Record<string, string>, key) => {
      acc[key] = `[${key}]`;
      return acc;
    },
    {}
  );

  let preview = "";
  if (draft) {
    try {
      preview = aplicarVariables(
        draft.contenido_html,
        SAMPLE_DATA as any,
        draft.ciudad_default
      );
      // sustituir variables extra
      preview = preview.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, k) =>
        extraSampleData[k.toLowerCase()] ?? `{{${k}}}`
      );
    } catch {}
  }

  const allVars = [
    ...VARIABLES_DISPONIBLES,
    ...(draft?.variables_extra || []).map((k) => ({ key: k, desc: "Variable personalizada" })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" /> Plantillas de Documentos
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Sistema unificado: vacaciones, entregas de uniformes, constancias, sanciones y notas.
            Usá variables entre llaves dobles, ej: <code>{"{{empleado}}"}</code>.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ℹ️ El <strong>logo</strong> y los <strong>datos del empleado</strong> se imprimen automáticamente en el encabezado.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nueva plantilla
        </Button>
      </div>

      <Tabs value={catActive} onValueChange={(v) => { setCatActive(v); }}>
        <TabsList className="flex-wrap h-auto">
          {CATEGORIAS.map((c) => {
            const n = plantillas.filter((p) => p.categoria === c.value).length;
            return (
              <TabsTrigger key={c.value} value={c.value}>
                {c.label}
                {n > 0 && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">{n}</Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {CATEGORIAS.map((c) => (
          <TabsContent key={c.value} value={c.value} className="mt-4">
            <div className="grid grid-cols-12 gap-4">
              <Card className="col-span-3 p-2 max-h-[600px] overflow-auto">
                {porCategoria.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">
                    No hay plantillas en esta categoría. Creá una nueva.
                  </p>
                )}
                {porCategoria.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => seleccionar(p)}
                    className={`w-full text-left px-2 py-2 rounded text-sm hover:bg-muted ${
                      selectedId === p.id ? "bg-muted font-medium" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{p.nombre}</span>
                      {p.es_sistema && (
                        <Badge variant="outline" className="text-[9px]">sistema</Badge>
                      )}
                    </div>
                    {!p.activa && (
                      <span className="text-[10px] text-muted-foreground">inactiva</span>
                    )}
                  </button>
                ))}
              </Card>

              <div className="col-span-9 space-y-4">
                {!draft || draft.categoria !== c.value ? (
                  <p className="text-sm text-muted-foreground p-4">
                    Seleccioná una plantilla de la lista o creá una nueva.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Nombre</Label>
                        <Input
                          value={draft.nombre}
                          onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Código (interno)</Label>
                        <Input value={draft.codigo} disabled />
                      </div>
                      <div>
                        <Label className="text-xs">Ciudad por defecto</Label>
                        <Input
                          value={draft.ciudad_default}
                          onChange={(e) => setDraft({ ...draft, ciudad_default: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Tipo (opcional)</Label>
                        <Input
                          value={draft.tipo_elemento ?? ""}
                          onChange={(e) => setDraft({ ...draft, tipo_elemento: e.target.value })}
                          placeholder="remera, buzo, calzado…"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Descripción</Label>
                        <Input
                          value={draft.descripcion ?? ""}
                          onChange={(e) => setDraft({ ...draft, descripcion: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Variables extra (separadas por coma)</Label>
                        <Input
                          value={(draft.variables_extra || []).join(", ")}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              variables_extra: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="item, motivo, sancion…"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-2">
                        <Label>Contenido (HTML)</Label>
                        <Textarea
                          value={draft.contenido_html}
                          onChange={(e) => setDraft({ ...draft, contenido_html: e.target.value })}
                          rows={14}
                          className="font-mono text-xs"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Etiquetas permitidas: <code>&lt;p&gt;</code>, <code>&lt;strong&gt;</code>,
                          <code>&lt;em&gt;</code>, <code>&lt;br&gt;</code>, <code>&lt;ul&gt;/&lt;li&gt;</code>.
                        </p>
                      </div>

                      <Card className="p-3 space-y-2 h-fit">
                        <Label className="flex items-center gap-1">
                          <Copy className="h-3 w-3" /> Variables disponibles
                        </Label>
                        <div className="space-y-1 max-h-72 overflow-auto">
                          {allVars.map((v) => (
                            <button
                              key={v.key}
                              type="button"
                              onClick={() => copyVar(v.key)}
                              className="w-full text-left px-2 py-1 rounded hover:bg-muted text-xs"
                              title={`Click para copiar {{${v.key}}}`}
                            >
                              <code className="text-primary">{`{{${v.key}}}`}</code>
                              <span className="text-muted-foreground"> — {v.desc}</span>
                            </button>
                          ))}
                        </div>
                      </Card>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Guardar cambios
                      </Button>
                      <Button variant="outline" onClick={handleDuplicate}>
                        <CopyPlus className="h-4 w-4 mr-2" /> Duplicar
                      </Button>
                      {!draft.es_sistema && (
                        <Button
                          variant="ghost"
                          className="text-destructive"
                          onClick={handleDelete}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                        </Button>
                      )}
                    </div>

                    <Card className="p-4">
                      <Label className="flex items-center gap-1 mb-2">
                        <Eye className="h-3 w-3" /> Vista previa (datos de muestra)
                      </Label>
                      <div
                        className="prose prose-sm max-w-none p-4 border rounded bg-background"
                        dangerouslySetInnerHTML={{ __html: preview }}
                      />
                    </Card>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva plantilla</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nombre</Label>
              <Input
                value={newPlantilla.nombre}
                onChange={(e) => setNewPlantilla({ ...newPlantilla, nombre: e.target.value })}
                placeholder="Ej: Entrega de zapatos de seguridad"
              />
            </div>
            <div>
              <Label className="text-xs">Categoría</Label>
              <Select
                value={newPlantilla.categoria}
                onValueChange={(v) => setNewPlantilla({ ...newPlantilla, categoria: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newPlantilla.categoria === "entregas" && (
              <div>
                <Label className="text-xs">Tipo de elemento (opcional)</Label>
                <Input
                  value={newPlantilla.tipo_elemento}
                  onChange={(e) => setNewPlantilla({ ...newPlantilla, tipo_elemento: e.target.value })}
                  placeholder="remera, buzo, calzado…"
                />
              </div>
            )}
            <div>
              <Label className="text-xs">Descripción (opcional)</Label>
              <Input
                value={newPlantilla.descripcion}
                onChange={(e) => setNewPlantilla({ ...newPlantilla, descripcion: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" /> Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
