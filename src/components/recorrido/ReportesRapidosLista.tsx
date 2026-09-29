import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BUCKET_EVIDENCIAS } from "./recorridoTypes";

interface Reporte {
  id: string;
  comentario: string | null;
  storage_path: string;
  estado: string;
  created_at: string;
  empleados: { nombre: string; apellido: string } | null;
  sucursales: { nombre: string } | null;
}

/** Lista de reportes rápidos (foto + comentario) que sube el personal de apoyo. */
export function ReportesRapidosLista({ esAdmin }: { esAdmin: boolean }) {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reportes_rapidos")
      .select("id, comentario, storage_path, estado, created_at, empleados:empleado_id(nombre, apellido), sucursales:sucursal_id(nombre)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast.error("No se pudieron cargar los reportes");
    } else {
      const lista = (data as unknown as Reporte[]) ?? [];
      setReportes(lista);
      const map: Record<string, string> = {};
      for (const r of lista) {
        const { data: blob } = await supabase.storage.from(BUCKET_EVIDENCIAS).download(r.storage_path);
        if (blob) map[r.id] = URL.createObjectURL(blob);
      }
      setUrls(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargar();
    return () => { Object.values(urls).forEach((u) => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolver = async (id: string) => {
    const { error } = await supabase.from("reportes_rapidos").update({ estado: "resuelto" }).eq("id", id);
    if (error) toast.error("No se pudo actualizar");
    else cargar();
  };

  const borrar = async (r: Reporte) => {
    if (!confirm("¿Borrar este reporte?")) return;
    await supabase.storage.from(BUCKET_EVIDENCIAS).remove([r.storage_path]);
    await supabase.from("reportes_rapidos").delete().eq("id", r.id);
    cargar();
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!reportes.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Todavía no hay reportes rápidos
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {reportes.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-3 space-y-2">
            <div className="aspect-video rounded border overflow-hidden bg-muted">
              {urls[r.id] ? (
                <img src={urls[r.id]} alt="reporte" className="h-full w-full object-cover" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin m-auto mt-16 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium truncate">
                {r.empleados ? `${r.empleados.nombre} ${r.empleados.apellido}` : "—"}
              </div>
              <Badge variant={r.estado === "resuelto" ? "default" : "secondary"}>
                {r.estado === "resuelto" ? "Resuelto" : "Pendiente"}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {r.sucursales?.nombre ?? "Sin sucursal"} ·{" "}
              {new Date(r.created_at).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </div>
            {r.comentario && <p className="text-sm">{r.comentario}</p>}
            {esAdmin && (
              <div className="flex gap-2">
                {r.estado !== "resuelto" && (
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => resolver(r.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar resuelto
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => borrar(r)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
