import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Pencil,
  Eye,
  Save,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react";
import {
  generarInstructivoGerentePDF,
  type InstructivoSeccion,
} from "@/utils/instructivoGerentePDF";

const SLUG = "gerente-vacaciones";

interface InstructivoRow {
  id: string;
  slug: string;
  titulo: string;
  descripcion: string | null;
  secciones: InstructivoSeccion[];
  version: number;
  actualizado_en: string;
  actualizado_por: string | null;
}

/** Render simple markdown (## headings, **bold**, - bullets) as React nodes */
function MarkdownView({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const nodes: JSX.Element[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = (key: number) => {
    if (bulletBuffer.length) {
      nodes.push(
        <ul key={`ul-${key}`} className="list-disc pl-6 space-y-1 my-2">
          {bulletBuffer.map((b, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inline(b) }} />
          ))}
        </ul>
      );
      bulletBuffer = [];
    }
  };

  const inline = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushBullets(idx);
      return;
    }
    if (line.startsWith("## ")) {
      flushBullets(idx);
      nodes.push(
        <h3 key={idx} className="text-base font-semibold text-secondary mt-3 mb-1">
          {line.replace(/^##\s+/, "")}
        </h3>
      );
      return;
    }
    if (/^[-*]\s+/.test(line)) {
      bulletBuffer.push(line.replace(/^[-*]\s+/, ""));
      return;
    }
    flushBullets(idx);
    nodes.push(
      <p
        key={idx}
        className="text-sm leading-relaxed my-1"
        dangerouslySetInnerHTML={{ __html: inline(line) }}
      />
    );
  });
  flushBullets(9999);
  return <div>{nodes}</div>;
}

export default function InstructivoGerente() {
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const admin = isAdmin();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [data, setData] = useState<InstructivoRow | null>(null);
  const [draft, setDraft] = useState<InstructivoRow | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data: row, error } = await supabase
      .from("instructivos_editables")
      .select("*")
      .eq("slug", SLUG)
      .maybeSingle();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (row) {
      const parsed: InstructivoRow = {
        ...row,
        secciones: ((row.secciones as any) || []) as InstructivoSeccion[],
      };
      setData(parsed);
      setDraft(parsed);
    }
    setLoading(false);
  };

  const handleDownload = () => {
    const src = editMode ? draft : data;
    if (!src) return;
    generarInstructivoGerentePDF({
      titulo: src.titulo,
      descripcion: src.descripcion,
      version: src.version,
      actualizado_en: src.actualizado_en,
      secciones: [...src.secciones].sort((a, b) => a.orden - b.orden),
    });
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const sorted = [...draft.secciones]
      .sort((a, b) => a.orden - b.orden)
      .map((s, i) => ({ ...s, orden: i + 1 }));

    const { error } = await supabase
      .from("instructivos_editables")
      .update({
        titulo: draft.titulo,
        descripcion: draft.descripcion,
        secciones: sorted as any,
        version: (draft.version || 1) + 1,
        actualizado_por: user?.id ?? null,
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", draft.id);

    setSaving(false);
    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Manual actualizado", description: "Los cambios se guardaron correctamente." });
    setEditMode(false);
    await load();
  };

  const updateSeccion = (id: string, patch: Partial<InstructivoSeccion>) => {
    if (!draft) return;
    setDraft({
      ...draft,
      secciones: draft.secciones.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  };

  const moveSeccion = (id: string, dir: -1 | 1) => {
    if (!draft) return;
    const arr = [...draft.secciones].sort((a, b) => a.orden - b.orden);
    const idx = arr.findIndex((s) => s.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= arr.length) return;
    [arr[idx].orden, arr[swap].orden] = [arr[swap].orden, arr[idx].orden];
    setDraft({ ...draft, secciones: arr });
  };

  const deleteSeccion = (id: string) => {
    if (!draft) return;
    setDraft({ ...draft, secciones: draft.secciones.filter((s) => s.id !== id) });
  };

  const addSeccion = () => {
    if (!draft) return;
    const orden = (draft.secciones.reduce((m, s) => Math.max(m, s.orden), 0) || 0) + 1;
    const nueva: InstructivoSeccion = {
      id: `sec-${Date.now()}`,
      orden,
      titulo: `Nueva sección ${orden}`,
      contenido: "## Subtítulo\nEscribí aquí el contenido.\n\n- Punto 1\n- Punto 2",
    };
    setDraft({ ...draft, secciones: [...draft.secciones, nueva] });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || !draft) {
    return (
      <div className="container mx-auto py-10">
        <p className="text-muted-foreground">No se encontró el manual.</p>
      </div>
    );
  }

  const view = editMode ? draft : data;
  const sorted = [...view.secciones].sort((a, b) => a.orden - b.orden);

  return (
    <div className="container mx-auto py-6 space-y-4 max-w-5xl">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1">
            {editMode ? (
              <>
                <Input
                  value={draft.titulo}
                  onChange={(e) => setDraft({ ...draft, titulo: e.target.value })}
                  className="text-xl font-bold h-auto py-1"
                />
                <Textarea
                  value={draft.descripcion ?? ""}
                  onChange={(e) => setDraft({ ...draft, descripcion: e.target.value })}
                  placeholder="Descripción del manual"
                  rows={2}
                />
              </>
            ) : (
              <>
                <CardTitle className="text-2xl">{view.titulo}</CardTitle>
                {view.descripcion && (
                  <CardDescription>{view.descripcion}</CardDescription>
                )}
                <div className="flex gap-2 pt-1">
                  <Badge variant="secondary">Versión {view.version}</Badge>
                  <Badge variant="outline">
                    Actualizado: {new Date(view.actualizado_en).toLocaleDateString("es-AR")}
                  </Badge>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
            {admin && !editMode && (
              <Button onClick={() => setEditMode(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar manual
              </Button>
            )}
            {admin && editMode && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDraft(data);
                    setEditMode(false);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar cambios
                </Button>
              </>
            )}
          </div>
        </CardHeader>
      </Card>

      {!editMode && (
        <Card>
          <CardContent className="pt-6">
            <Accordion type="multiple" defaultValue={sorted.map((s) => s.id)}>
              {sorted.map((s) => (
                <AccordionItem key={s.id} value={s.id}>
                  <AccordionTrigger className="text-left font-semibold text-primary">
                    {s.titulo}
                  </AccordionTrigger>
                  <AccordionContent>
                    <MarkdownView text={s.contenido} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {editMode && (
        <div className="space-y-4">
          {sorted.map((s, i) => (
            <Card key={s.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <Badge variant="outline">Sección {i + 1}</Badge>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => moveSeccion(s.id, -1)}
                    disabled={i === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => moveSeccion(s.id, 1)}
                    disabled={i === sorted.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteSeccion(s.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Título</Label>
                  <Input
                    value={s.titulo}
                    onChange={(e) => updateSeccion(s.id, { titulo: e.target.value })}
                  />
                </div>
                <div>
                  <Label>
                    Contenido (Markdown: <code>## título</code>, <code>**negrita**</code>,{" "}
                    <code>- viñeta</code>)
                  </Label>
                  <Textarea
                    value={s.contenido}
                    onChange={(e) => updateSeccion(s.id, { contenido: e.target.value })}
                    rows={10}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="border rounded p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2">Vista previa:</p>
                  <MarkdownView text={s.contenido} />
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" onClick={addSeccion} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Agregar sección
          </Button>
        </div>
      )}
    </div>
  );
}
