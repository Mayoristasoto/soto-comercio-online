import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MessageCircle } from "lucide-react";

const db = supabase as any;

interface Charla {
  id: string;
  fecha: string;
  hora_inicio: string;
  motivo: string | null;
  estado: string;
  notas_rrhh: string | null;
  empleados: { nombre: string; apellido: string; sucursales?: { nombre: string } | null } | null;
}

export default function CharlasRRHHLista({ refrescar }: { refrescar?: number }) {
  const [charlas, setCharlas] = useState<Charla[]>([]);
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [verTodas, setVerTodas] = useState(false);

  const cargar = async () => {
    let q = db
      .from("charlas_rrhh")
      .select("id, fecha, hora_inicio, motivo, estado, notas_rrhh, empleados(nombre, apellido, sucursales:sucursal_id(nombre))")
      .order("fecha", { ascending: !verTodas })
      .order("hora_inicio")
      .limit(100);
    if (!verTodas) q = q.gte("fecha", format(new Date(), "yyyy-MM-dd")).eq("estado", "confirmada");
    const { data, error } = await q;
    if (error) return toast.error(error.message);
    setCharlas(data || []);
  };

  useEffect(() => { cargar(); }, [refrescar, verTodas]);

  const actualizar = async (c: Charla, estado: string) => {
    const { error } = await db
      .from("charlas_rrhh")
      .update({ estado, notas_rrhh: notas[c.id] ?? c.notas_rrhh })
      .eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(estado === "cancelada" ? "Charla cancelada, el horario quedó libre" : "Charla actualizada");
    cargar();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setVerTodas(!verTodas)}>
          {verTodas ? "Ver solo próximas" : "Ver historial"}
        </Button>
      </div>
      {charlas.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No hay charlas reservadas.</p>
      ) : (
        charlas.map((c) => (
          <Card key={c.id} className="border-l-4 border-l-accent">
            <CardContent className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <MessageCircle className="h-4 w-4 text-accent" />
                <span className="font-medium">
                  {c.empleados?.apellido}, {c.empleados?.nombre}
                </span>
                {c.empleados?.sucursales?.nombre && <Badge variant="outline">{c.empleados.sucursales.nombre}</Badge>}
                <span className="ml-auto text-sm capitalize">
                  {format(new Date(c.fecha + "T00:00:00"), "EEEE d/MM", { locale: es })} · {c.hora_inicio.slice(0, 5)}
                </span>
                <Badge variant={c.estado === "confirmada" ? "default" : "secondary"}>{c.estado}</Badge>
              </div>
              {c.motivo && <p className="text-sm text-muted-foreground">Motivo: {c.motivo}</p>}
              <Textarea
                rows={2}
                placeholder="Notas privadas de RRHH"
                defaultValue={c.notas_rrhh ?? ""}
                onChange={(e) => setNotas({ ...notas, [c.id]: e.target.value })}
              />
              {c.estado === "confirmada" && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => actualizar(c, "realizada")}>Marcar realizada</Button>
                  <Button size="sm" variant="outline" onClick={() => actualizar(c, "no_asistio")}>No vino</Button>
                  <Button size="sm" variant="destructive" onClick={() => actualizar(c, "cancelada")}>Cancelar</Button>
                </div>
              )}
              {c.estado !== "confirmada" && (
                <Button size="sm" variant="outline" onClick={() => actualizar(c, c.estado)}>Guardar notas</Button>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
