import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, Info, Loader2 } from "lucide-react";
import { VistaSemanaPlanificacion } from "@/components/fichero/VistaSemanaPlanificacion";

/**
 * Planificación semanal para encargados de sucursal.
 * Solo su sucursal, sin costos y con envío a validación de RRHH.
 */
export default function EncargadoPlanificacionSemanal() {
  const [loading, setLoading] = useState(true);
  const [sucursalId, setSucursalId] = useState<string | null>(null);
  const [sucursalNombre, setSucursalNombre] = useState<string>("");

  useEffect(() => {
    const cargar = async () => {
      try {
        const { data: sucId } = await (supabase as any).rpc("current_user_sucursal_id");
        if (sucId) {
          setSucursalId(sucId as string);
          const { data: suc } = await supabase
            .from("sucursales")
            .select("nombre")
            .eq("id", sucId as string)
            .maybeSingle();
          setSucursalNombre(suc?.nombre || "");
        }
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando tu sucursal...
      </div>
    );
  }

  if (!sucursalId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No tenés una sucursal asignada, por lo que todavía no podés armar la planificación
            semanal. Pedile a RRHH que te asigne tu sucursal.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CalendarRange className="h-8 w-8 text-primary" />
          <span>Mi planificación semanal</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          Armá los horarios de tu sucursal día por día y enviala a validación de RRHH.
        </p>
        {sucursalNombre && (
          <Badge variant="secondary" className="mt-2">
            {sucursalNombre}
          </Badge>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/20 px-3 py-2 text-sm text-blue-800 dark:text-blue-300">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          Guardá la semana como borrador todas las veces que necesites. Cuando esté lista, usá
          “Enviar a validación de RRHH”. Mientras esté pendiente o aprobada no se puede modificar; si
          RRHH la rechaza vas a ver el motivo y podés corregirla.
        </span>
      </div>

      <VistaSemanaPlanificacion modoEncargado sucursalId={sucursalId} />
    </div>
  );
}
