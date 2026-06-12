import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Eye, Copy, FileText } from "lucide-react";
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
}

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

export function PlantillasDocumentosManager() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Partial<Plantilla>>>({});
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
        .eq("activa", true)
        .order("nombre", { ascending: true });
      if (error) throw error;
      setPlantillas(data || []);
      if (data && data.length > 0 && !active) setActive(data[0].codigo);
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

  const getCurrent = (codigo: string): Plantilla | undefined => {
    const original = plantillas.find((p) => p.codigo === codigo);
    if (!original) return undefined;
    const d = draft[codigo] || {};
    return { ...original, ...d };
  };

  const updateDraft = (codigo: string, patch: Partial<Plantilla>) => {
    setDraft((s) => ({ ...s, [codigo]: { ...(s[codigo] || {}), ...patch } }));
  };

  const handleSave = async (codigo: string) => {
    const current = getCurrent(codigo);
    if (!current) return;
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from("plantillas_documentos")
        .update({
          contenido_html: current.contenido_html,
          ciudad_default: current.ciudad_default,
          updated_by: user?.id ?? null,
        })
        .eq("codigo", codigo);
      if (error) throw error;
      toast({ title: "Plantilla guardada" });
      setDraft((s) => {
        const c = { ...s };
        delete c[codigo];
        return c;
      });
      await cargar();
    } catch (e: any) {
      toast({
        title: "Error al guardar",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" /> Plantillas de Documentos
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Editá el contenido de las constancias y notas que se imprimen desde la aplicación.
          Usá variables entre llaves dobles, ej: <code>{"{{empleado}}"}</code>.
        </p>
      </div>

      <Tabs value={active ?? ""} onValueChange={setActive}>
        <TabsList className="flex-wrap h-auto">
          {plantillas.map((p) => (
            <TabsTrigger key={p.codigo} value={p.codigo}>
              {p.nombre}
              {draft[p.codigo] && (
                <Badge variant="secondary" className="ml-2 text-[10px]">sin guardar</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {plantillas.map((p) => {
          const current = getCurrent(p.codigo)!;
          const dirty = !!draft[p.codigo];
          let preview = "";
          try {
            preview = aplicarVariables(current.contenido_html, SAMPLE_DATA as any, current.ciudad_default);
          } catch {}
          return (
            <TabsContent key={p.codigo} value={p.codigo} className="space-y-4 mt-4">
              {p.descripcion && (
                <p className="text-sm text-muted-foreground">{p.descripcion}</p>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-3">
                  <div>
                    <Label>Ciudad por defecto</Label>
                    <Input
                      value={current.ciudad_default}
                      onChange={(e) =>
                        updateDraft(p.codigo, { ciudad_default: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Contenido (HTML)</Label>
                    <Textarea
                      value={current.contenido_html}
                      onChange={(e) =>
                        updateDraft(p.codigo, { contenido_html: e.target.value })
                      }
                      rows={14}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Etiquetas permitidas: <code>&lt;p&gt;</code>, <code>&lt;strong&gt;</code>,
                      <code>&lt;em&gt;</code>, <code>&lt;br&gt;</code>, <code>&lt;ul&gt;/&lt;li&gt;</code>.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSave(p.codigo)}
                      disabled={!dirty || saving}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Guardar cambios
                    </Button>
                    {dirty && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          setDraft((s) => {
                            const c = { ...s };
                            delete c[p.codigo];
                            return c;
                          })
                        }
                      >
                        Descartar
                      </Button>
                    )}
                  </div>
                </div>

                <Card className="p-3 space-y-2 h-fit">
                  <Label className="flex items-center gap-1">
                    <Copy className="h-3 w-3" /> Variables disponibles
                  </Label>
                  <div className="space-y-1 max-h-72 overflow-auto">
                    {VARIABLES_DISPONIBLES.map((v) => (
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

              <Card className="p-4">
                <Label className="flex items-center gap-1 mb-2">
                  <Eye className="h-3 w-3" /> Vista previa (datos de muestra)
                </Label>
                <div
                  className="prose prose-sm max-w-none p-4 border rounded bg-background"
                  dangerouslySetInnerHTML={{ __html: preview }}
                />
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
