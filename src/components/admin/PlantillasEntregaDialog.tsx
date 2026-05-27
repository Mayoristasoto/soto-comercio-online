import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save } from "lucide-react";

export interface Plantilla {
  id: string;
  nombre: string;
  tipo_elemento: string;
  template_html: string | null;
  activo: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChanged?: () => void;
}

const DEFAULT_TEMPLATE = `<div style="padding:40px;font-family:Arial,sans-serif;color:#272c4d;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="color:#4b0d6d;margin:0;">Comprobante de Entrega</h1>
  </div>
  <p><strong>Fecha:</strong> {{fecha}}</p>
  <p><strong>Empleado:</strong> {{empleado_nombre}}</p>
  <p><strong>Legajo:</strong> {{legajo}}</p>

  <div style="margin:24px 0;padding:16px;background:#f5f3ee;border-radius:8px;">
    <h3 style="margin:0 0 8px 0;color:#95198d;">Elemento entregado</h3>
    <p><strong>Item:</strong> {{item}}</p>
    <p><strong>Observaciones:</strong> {{observaciones}}</p>
  </div>

  <div style="display:flex;justify-content:space-between;margin-top:80px;">
    <div style="text-align:center;flex:1;">
      <div style="border-top:2px solid #272c4d;padding-top:8px;">
        <strong>Firma Empleado</strong><br/>
        <span style="font-size:12px;color:#616e75;">{{empleado_nombre}}</span>
      </div>
    </div>
    <div style="text-align:center;flex:1;">
      <div style="border-top:2px solid #272c4d;padding-top:8px;">
        <strong>Firma RRHH</strong>
      </div>
    </div>
  </div>
</div>`;

const SAMPLE = {
  empleado_nombre: "Juan Pérez",
  legajo: "1234",
  fecha: new Date().toLocaleDateString("es-AR"),
  item: "Zapatos de seguridad",
  tipo_elemento: "calzado",
  observaciones: "Talle 42",
};

export function renderPlantilla(
  html: string,
  data: Partial<typeof SAMPLE> & Record<string, string>
) {
  return Object.entries({ ...SAMPLE, ...data }).reduce(
    (acc, [k, v]) => acc.split(`{{${k}}}`).join(String(v ?? "")),
    html
  );
}

export default function PlantillasEntregaDialog({ open, onOpenChange, onChanged }: Props) {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Plantilla | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) cargar();
  }, [open]);

  const cargar = async () => {
    const { data, error } = await supabase
      .from("plantillas_elementos")
      .select("id, nombre, tipo_elemento, template_html, activo")
      .order("nombre");
    if (error) {
      toast.error("Error", { description: error.message });
      return;
    }
    setPlantillas((data ?? []) as any);
    if (!selectedId && data?.length) {
      setSelectedId(data[0].id);
      setDraft(data[0] as any);
    }
  };

  const seleccionar = (p: Plantilla) => {
    setSelectedId(p.id);
    setDraft(p);
  };

  const nueva = () => {
    setSelectedId(null);
    setDraft({
      id: "",
      nombre: "Nueva plantilla",
      tipo_elemento: "general",
      template_html: DEFAULT_TEMPLATE,
      activo: true,
    });
  };

  const guardar = async () => {
    if (!draft) return;
    if (!draft.nombre.trim()) {
      toast.error("Ingresá un nombre");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nombre: draft.nombre.trim(),
        tipo_elemento: draft.tipo_elemento || "general",
        template_html: draft.template_html || DEFAULT_TEMPLATE,
        activo: draft.activo,
      };
      if (draft.id) {
        const { error } = await supabase
          .from("plantillas_elementos")
          .update(payload)
          .eq("id", draft.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("plantillas_elementos")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setSelectedId(data.id);
        setDraft(data as any);
      }
      toast.success("Plantilla guardada");
      await cargar();
      onChanged?.();
    } catch (e: any) {
      toast.error("Error al guardar", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async () => {
    if (!draft?.id) return;
    if (!confirm(`¿Eliminar plantilla "${draft.nombre}"?`)) return;
    const { error } = await supabase
      .from("plantillas_elementos")
      .delete()
      .eq("id", draft.id);
    if (error) {
      toast.error("Error", { description: error.message });
      return;
    }
    toast.success("Plantilla eliminada");
    setDraft(null);
    setSelectedId(null);
    await cargar();
    onChanged?.();
  };

  const previewHtml = draft?.template_html
    ? renderPlantilla(draft.template_html, {})
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Plantillas de comprobante</DialogTitle>
          <DialogDescription>
            Personalizá el HTML del comprobante. Variables disponibles:{" "}
            <code className="text-xs">
              {"{{empleado_nombre}} {{legajo}} {{fecha}} {{item}} {{tipo_elemento}} {{observaciones}}"}
            </code>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-4 flex-1 overflow-hidden">
          <div className="col-span-3 border-r pr-3 overflow-y-auto space-y-1">
            <Button size="sm" variant="outline" className="w-full" onClick={nueva}>
              <Plus className="h-4 w-4 mr-1" /> Nueva
            </Button>
            {plantillas.map((p) => (
              <button
                key={p.id}
                onClick={() => seleccionar(p)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted ${
                  selectedId === p.id ? "bg-muted font-medium" : ""
                }`}
              >
                {p.nombre}
                {!p.activo && (
                  <span className="ml-2 text-xs text-muted-foreground">(inactiva)</span>
                )}
              </button>
            ))}
          </div>

          <div className="col-span-9 overflow-y-auto">
            {draft ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nombre</Label>
                    <Input
                      value={draft.nombre}
                      onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo</Label>
                    <Input
                      value={draft.tipo_elemento}
                      onChange={(e) =>
                        setDraft({ ...draft, tipo_elemento: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={draft.activo}
                    onCheckedChange={(v) => setDraft({ ...draft, activo: v })}
                  />
                  <Label className="text-sm">Activa</Label>
                </div>

                <Tabs defaultValue="editor">
                  <TabsList>
                    <TabsTrigger value="editor">HTML</TabsTrigger>
                    <TabsTrigger value="preview">Vista previa</TabsTrigger>
                  </TabsList>
                  <TabsContent value="editor">
                    <Textarea
                      value={draft.template_html ?? ""}
                      onChange={(e) =>
                        setDraft({ ...draft, template_html: e.target.value })
                      }
                      rows={18}
                      className="font-mono text-xs"
                    />
                  </TabsContent>
                  <TabsContent value="preview">
                    <div
                      className="border rounded p-3 bg-white text-black max-h-[420px] overflow-auto"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(previewHtml),
                      }}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Seleccioná una plantilla o creá una nueva.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          {draft?.id && (
            <Button variant="ghost" className="text-destructive" onClick={eliminar}>
              <Trash2 className="h-4 w-4 mr-1" /> Eliminar
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={guardar} disabled={saving || !draft}>
            <Save className="h-4 w-4 mr-1" /> Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
