import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, RefreshCw } from "lucide-react";
import { formatArgentinaDateTime } from "@/lib/dateUtils";

const ETIQUETAS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pin_creado: { label: "PIN creado", variant: "default" },
  pin_cambiado: { label: "PIN cambiado", variant: "default" },
  pin_eliminado: { label: "PIN eliminado", variant: "outline" },
  intento_fallido: { label: "Intento fallido", variant: "destructive" },
  ingreso_ok: { label: "Ingreso correcto", variant: "secondary" },
  bloqueado: { label: "Bloqueado", variant: "destructive" },
  desbloqueado: { label: "Desbloqueado", variant: "outline" },
  activado: { label: "Activado", variant: "outline" },
  desactivado: { label: "Desactivado", variant: "outline" },
};

export default function PinEventosLog() {
  const [busqueda, setBusqueda] = useState("");
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["pin_eventos"],
    queryFn: async () => {
      const { data: ev, error } = await (supabase as any)
        .from("pin_eventos").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      const ids = [...new Set((ev || []).map((e: any) => e.empleado_id))] as string[];
      const { data: emps } = ids.length
        ? await supabase.from("empleados").select("id, nombre, apellido, dni").in("id", ids)
        : { data: [] as any[] };
      const map = new Map((emps || []).map((e: any) => [e.id, e]));
      return (ev || []).map((e: any) => ({ ...e, emp: map.get(e.empleado_id) }));
    },
  });

  const q = busqueda.toLowerCase();
  const filas = (data || []).filter((e: any) =>
    !q || `${e.emp?.nombre} ${e.emp?.apellido} ${e.emp?.dni}`.toLowerCase().includes(q));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Registro de PIN</CardTitle>
          <CardDescription>Todo lo que pasa con los PIN: creación, blanqueo, intentos fallidos, ingresos y bloqueos.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Buscar empleado o DNI..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <ScrollArea className="h-[420px] rounded border">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Cargando...</p>
          ) : !filas.length ? (
            <p className="p-4 text-sm text-muted-foreground">Sin eventos todavía. Se registran desde ahora.</p>
          ) : (
            <ul className="divide-y">
              {filas.map((e: any) => {
                const et = ETIQUETAS[e.evento] || { label: e.evento, variant: "outline" as const };
                return (
                  <li key={e.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                    <span className="w-36 text-xs text-muted-foreground">{formatArgentinaDateTime(e.created_at)}</span>
                    <span className="font-medium">{e.emp ? `${e.emp.apellido}, ${e.emp.nombre}` : e.empleado_id}</span>
                    <Badge variant={et.variant}>{et.label}</Badge>
                    {e.intentos_fallidos != null && <span className="text-xs text-muted-foreground">({e.intentos_fallidos} intentos)</span>}
                    {e.detalle && <span className="text-xs text-muted-foreground">{e.detalle}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
