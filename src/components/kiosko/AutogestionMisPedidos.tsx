import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ListChecks } from "lucide-react";
import { format } from "date-fns";

const TIPO: Record<string, string> = {
  vacaciones: "Vacaciones",
  adelanto_sueldo: "Adelanto de sueldo",
  dia_medico: "Día médico",
  permiso: "Permiso",
  charla_rrhh: "Charla con RRHH",
};

function estadoTexto(p: any) {
  if (p.tipo === "charla_rrhh") {
    return p.estado === "confirmada" ? "Reservada" : p.estado === "realizada" ? "Realizada" : p.estado === "cancelada" ? "Cancelada" : p.estado;
  }
  if (p.estado === "pendiente") return p.etapa === "gerente" ? "Esperando gerente" : "Esperando RRHH";
  if (p.estado === "aprobada") return "Aprobada";
  if (p.estado === "rechazada") return "Rechazada";
  if (p.estado === "gozadas") return "Gozadas";
  return p.estado;
}

export default function AutogestionMisPedidos({ empleadoId, onVolver }: { empleadoId: string; onVolver: () => void }) {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (supabase as any).rpc("kiosk_mis_pedidos", { p_empleado_id: empleadoId }).then(({ data }: any) => {
      setPedidos(data || []);
      setCargando(false);
    });
  }, [empleadoId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><ListChecks className="h-6 w-6" /> Mis pedidos</CardTitle>
          <Button variant="outline" onClick={onVolver}>Volver</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {cargando ? (
          <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : pedidos.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No hiciste pedidos en los últimos 6 meses.</p>
        ) : (
          pedidos.map((p) => (
            <div key={p.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold">{TIPO[p.tipo] ?? p.tipo}</span>
                <Badge
                  className="ml-auto text-sm"
                  variant={p.estado === "rechazada" || p.estado === "cancelada" ? "destructive" : p.estado === "pendiente" ? "secondary" : "default"}
                >
                  {estadoTexto(p)}
                </Badge>
              </div>
              <p className="mt-1 text-muted-foreground">{p.detalle}</p>
              {p.comentario && <p className="mt-1 text-sm">Comentario: {p.comentario}</p>}
              <p className="mt-1 text-xs text-muted-foreground">Pedido el {format(new Date(p.created_at), "dd/MM/yyyy")}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
