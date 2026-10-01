import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { periodoSugerido } from "@/lib/envioEstudio";

interface Nota { id: string; periodo: string; texto: string; destino: string; created_at: string; created_by: string | null }
const DEST: Record<string, string> = { obs: "Al lado del nombre", general: "Anotaciones generales", ambos: "Ambos" };

export default function NotasEstudioEmpleado({ empleadoId }: { empleadoId: string }) {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [enviados, setEnviados] = useState<Set<string>>(new Set());
  const [texto, setTexto] = useState("");
  const [destino, setDestino] = useState("obs");
  const [periodo, setPeriodo] = useState<string>(() => { try { return (periodoSugerido as any)(); } catch { return new Date().toISOString().slice(0, 7); } });

  const cargar = async () => {
    const sb = supabase as any;
    const [{ data }, { data: env }] = await Promise.all([
      sb.from("novedades_estudio_notas").select("id,periodo,texto,destino,created_at,created_by").eq("empleado_id", empleadoId).order("periodo", { ascending: false }).order("created_at"),
      sb.from("novedades_estudio_borradores").select("periodo").eq("estado", "enviada"),
    ]);
    setNotas(data || []);
    setEnviados(new Set((env || []).map((e: any) => e.periodo)));
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [empleadoId]);

  const guardar = async () => {
    if (!texto.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("novedades_estudio_notas").insert({ empleado_id: empleadoId, periodo, texto: texto.trim(), destino, created_by: u.user?.id });
    if (error) return toast.error("No se pudo guardar: " + error.message);
    setTexto(""); toast.success("Nota guardada"); cargar();
  };
  const borrar = async (id: string) => {
    await (supabase as any).from("novedades_estudio_notas").delete().eq("id", id); cargar();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Notas para el Estudio Contable</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[120px_1fr_200px_auto] items-start">
          <Input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} />
          <Textarea rows={2} placeholder="Ej: adelanto $50.000" value={texto} onChange={e => setTexto(e.target.value)} />
          <Select value={destino} onValueChange={setDestino}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(DEST).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={guardar}>Guardar</Button>
        </div>
        {notas.length === 0 && <p className="text-sm text-muted-foreground">Sin notas cargadas.</p>}
        <div className="space-y-2">
          {notas.map(n => {
            const env = enviados.has(n.periodo);
            return (
              <div key={n.id} className="flex items-start gap-2 border rounded-md p-2 text-sm">
                <Badge variant="outline">{n.periodo}</Badge>
                <div className="flex-1">
                  <div>{n.texto}</div>
                  <div className="text-xs text-muted-foreground">{DEST[n.destino] ?? n.destino} · {new Date(n.created_at).toLocaleDateString("es-AR")}</div>
                </div>
                {env ? <Badge>Enviada</Badge> : <Badge variant="secondary">Pendiente</Badge>}
                {!env && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => borrar(n.id)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
