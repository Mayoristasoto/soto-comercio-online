import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, LayoutList, Loader2, Plus, Trash2 } from "lucide-react";

interface Plantilla {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}
interface PlantillaItem {
  id: string;
  plantilla_id: string;
  texto: string;
  seccion: string | null;
  orden: number;
}

const SIN_SECCION = "__sin_seccion__";

function agruparPorSeccion(items: PlantillaItem[]): [string, PlantillaItem[]][] {
  const mapa = new Map<string, PlantillaItem[]>();
  items.forEach((i) => {
    const key = i.seccion?.trim() || SIN_SECCION;
    if (!mapa.has(key)) mapa.set(key, []);
    mapa.get(key)!.push(i);
  });
  return Array.from(mapa.entries());
}

export default function ChecklistPlantillas() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [items, setItems] = useState<PlantillaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevaPlantilla, setNuevaPlantilla] = useState("");
  const [nuevoItem, setNuevoItem] = useState<Record<string, string>>({});
  const [nuevaSeccion, setNuevaSeccion] = useState<Record<string, string>>({});

  const cargar = async () => {
    setLoading(true);
    try {
      const db = supabase as any;
      const pl = await db.from("checklist_plantillas").select("id, nombre, descripcion, activo").order("nombre");
      setPlantillas((pl.data || []) as Plantilla[]);
      const it = await db
        .from("checklist_plantilla_items")
        .select("id, plantilla_id, texto, seccion, orden")
        .order("orden");
      setItems((it.data || []) as PlantillaItem[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const crearPlantilla = async () => {
    if (!nuevaPlantilla.trim()) return;
    const db = supabase as any;
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await db
      .from("checklist_plantillas")
      .insert({ nombre: nuevaPlantilla.trim(), created_by: userData.user?.id ?? null });
    if (error) {
      toast.error("No se pudo crear la plantilla: " + error.message);
      return;
    }
    setNuevaPlantilla("");
    cargar();
  };

  const eliminarPlantilla = async (id: string) => {
    const db = supabase as any;
    const { error } = await db.from("checklist_plantillas").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo eliminar: " + error.message);
      return;
    }
    cargar();
  };

  const agregarItem = async (plantillaId: string) => {
    const texto = (nuevoItem[plantillaId] || "").trim();
    if (!texto) return;
    const orden = items.filter((i) => i.plantilla_id === plantillaId).length;
    const db = supabase as any;
    const seccion = (nuevaSeccion[plantillaId] || "").trim() || null;
    const { error } = await db
      .from("checklist_plantilla_items")
      .insert({ plantilla_id: plantillaId, texto, seccion, orden });
    if (error) {
      toast.error("No se pudo agregar el ítem: " + error.message);
      return;
    }
    setNuevoItem((prev) => ({ ...prev, [plantillaId]: "" }));
    cargar();
  };

  const eliminarItem = async (id: string) => {
    const db = supabase as any;
    const { error } = await db.from("checklist_plantilla_items").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo eliminar el ítem: " + error.message);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/rrhh/checklist">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a controles
          </Link>
        </Button>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <LayoutList className="h-6 w-6 text-primary" />
          Plantillas de checklist
        </h1>
        <p className="text-sm text-muted-foreground">
          Definí listas de ítems reutilizables para agilizar la creación de controles.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nueva plantilla</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Nombre de la plantilla (ej. Control de apertura)"
            value={nuevaPlantilla}
            maxLength={120}
            onChange={(e) => setNuevaPlantilla(e.target.value)}
          />
          <Button onClick={crearPlantilla} disabled={!nuevaPlantilla.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Crear
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : plantillas.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Todavía no hay plantillas creadas.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {plantillas.map((p) => {
            const pItems = items.filter((i) => i.plantilla_id === p.id);
            return (
              <Card key={p.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{p.nombre}</CardTitle>
                    <CardDescription>{pItems.length} ítem(s)</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {!p.activo && <Badge variant="outline">Inactiva</Badge>}
                    <Button variant="ghost" size="icon" onClick={() => eliminarPlantilla(p.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {agruparPorSeccion(pItems).map(([seccion, secItems]) => (
                    <div key={seccion} className="space-y-1">
                      {seccion !== SIN_SECCION && (
                        <p className="border-b pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {seccion}
                        </p>
                      )}
                      <ul className="space-y-1">
                        {secItems.map((i) => (
                          <li
                            key={i.id}
                            className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1"
                          >
                            <span className="text-sm">{i.texto}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => eliminarItem(i.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      placeholder="Sección (opcional)"
                      value={nuevaSeccion[p.id] || ""}
                      maxLength={100}
                      className="sm:w-48"
                      onChange={(e) => setNuevaSeccion((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    />
                    <Input
                      placeholder="Nuevo ítem"
                      value={nuevoItem[p.id] || ""}
                      maxLength={300}
                      onChange={(e) => setNuevoItem((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") agregarItem(p.id);
                      }}
                    />
                    <Button variant="outline" onClick={() => agregarItem(p.id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
