import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarPlus, Trash2, X } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

const db = supabase as any;

interface Props {
  configId: string;
  duracionDefault: number;
  onCambio: () => void;
}

const aMin = (h: string) => {
  const [a, b] = h.split(":").map(Number);
  return a * 60 + b;
};
const aHora = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default function AbrirDiasPuntuales({ configId, duracionDefault, onCambio }: Props) {
  const [dias, setDias] = useState<Date[]>([]);
  const [desde, setDesde] = useState("14:00");
  const [hasta, setHasta] = useState("17:00");
  const [intervalo, setIntervalo] = useState(String(duracionDefault || 30));
  const [uso, setUso] = useState("ambos");
  const [reemplazar, setReemplazar] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const paso = Number(intervalo);
  const ini = aMin(desde);
  const fin = aMin(hasta);
  const horarios: string[] = [];
  for (let m = ini; m + paso <= fin; m += paso) horarios.push(aHora(m));

  const fechas = [...dias].sort((a, b) => a.getTime() - b.getTime()).map((d) => format(d, "yyyy-MM-dd"));

  const abrir = async () => {
    if (fechas.length === 0) return toast.error("Elegí al menos un día en el calendario");
    if (horarios.length === 0) return toast.error("El rango horario no alcanza para ningún turno");
    setGuardando(true);
    try {
      const { data: existentes, error: e1 } = await db
        .from("entrevistas_slots")
        .select("id, fecha, hora_inicio, estado")
        .eq("config_id", configId)
        .in("fecha", fechas);
      if (e1) throw e1;

      if (reemplazar) {
        const borrar = (existentes || []).filter((s: any) => s.estado !== "reservado").map((s: any) => s.id);
        if (borrar.length) {
          const { error } = await db.from("entrevistas_slots").delete().in("id", borrar);
          if (error) throw error;
        }
      }
      const quedan = new Set(
        (existentes || [])
          .filter((s: any) => !reemplazar || s.estado === "reservado")
          .map((s: any) => `${s.fecha}_${String(s.hora_inicio).slice(0, 5)}`),
      );
      const filas = fechas.flatMap((f) =>
        horarios
          .filter((h) => !quedan.has(`${f}_${h}`))
          .map((h) => ({
            config_id: configId,
            fecha: f,
            hora_inicio: h,
            hora_fin: aHora(aMin(h) + paso),
            estado: "disponible",
            uso,
          })),
      );
      if (filas.length) {
        const { error } = await db.from("entrevistas_slots").insert(filas);
        if (error) throw error;
      }
      toast.success(`${filas.length} horarios abiertos en ${fechas.length} día(s)`);
      setDias([]);
      onCambio();
    } catch (e: any) {
      toast.error("No se pudieron abrir: " + (e.message || e));
    } finally {
      setGuardando(false);
    }
  };

  const cerrar = async () => {
    if (fechas.length === 0) return toast.error("Elegí los días a cerrar");
    const { error } = await db
      .from("entrevistas_slots")
      .delete()
      .eq("config_id", configId)
      .neq("estado", "reservado")
      .in("fecha", fechas);
    if (error) return toast.error(error.message);
    toast.success("Horarios libres de esos días cerrados");
    setDias([]);
    onCambio();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarPlus className="h-5 w-5" /> Abrir días puntuales
        </CardTitle>
        <CardDescription>
          Marcá uno o varios días en el calendario, elegí el horario y abrilos juntos. Cada día puede tener un
          horario distinto: abrí primero unos días con un horario y después otros con otro.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[auto_1fr]">
        <Calendar
          mode="multiple"
          selected={dias}
          onSelect={(d) => setDias(d || [])}
          locale={es}
          disabled={(d) => d < startOfDay(new Date())}
          className="rounded-md border pointer-events-auto"
        />
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Días elegidos ({fechas.length})</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {fechas.length === 0 && <span className="text-sm text-muted-foreground">Ninguno todavía</span>}
              {dias
                .slice()
                .sort((a, b) => a.getTime() - b.getTime())
                .map((d) => (
                  <Badge key={d.toISOString()} variant="secondary" className="gap-1">
                    {format(d, "EEE d MMM", { locale: es })}
                    <button onClick={() => setDias(dias.filter((x) => x.getTime() !== d.getTime()))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input type="time" className="w-28" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input type="time" className="w-28" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cada</Label>
              <Select value={intervalo} onValueChange={setIntervalo}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[15, 20, 30, 45, 60].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} minutos
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Para</Label>
              <Select value={uso} onValueChange={setUso}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambos">Entrevistas y charlas</SelectItem>
                  <SelectItem value="entrevista">Solo entrevistas</SelectItem>
                  <SelectItem value="charla">Solo charlas con empleados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Vista previa ({horarios.length} turnos por día)</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {horarios.map((h) => (
                <Badge key={h} variant="outline">
                  {h}
                </Badge>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={reemplazar} onChange={(e) => setReemplazar(e.target.checked)} />
            Reemplazar los horarios libres que ya tengan esos días (los reservados no se tocan)
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={abrir} disabled={guardando} className="gap-2">
              <CalendarPlus className="h-4 w-4" /> Abrir horarios en {fechas.length || ""} día(s)
            </Button>
            <Button variant="outline" onClick={cerrar} disabled={guardando} className="gap-2">
              <Trash2 className="h-4 w-4" /> Cerrar esos días
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
