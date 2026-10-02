import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw, Send, PlugZap } from "lucide-react";
import { conexionesWhaticket, enviarWhatsApp, probarWhaticket, reintentarEnvio } from "@/lib/whatsapp";

const db = supabase as any;

export default function WhatsAppEnvios() {
  const [conexiones, setConexiones] = useState<any[]>([]);
  const [conexionId, setConexionId] = useState<string>("none");
  const [envios, setEnvios] = useState<any[]>([]);
  const [numero, setNumero] = useState("");
  const [texto, setTexto] = useState("Mensaje de prueba desde RRHH Mayorista Soto");
  const [estadoApi, setEstadoApi] = useState<string>("");

  const cargarEnvios = async () => {
    const { data } = await db.from("whatsapp_envios").select("*").order("created_at", { ascending: false }).limit(200);
    setEnvios(data ?? []);
  };

  useEffect(() => {
    (async () => {
      const { data } = await db.from("fichado_configuracion").select("valor").eq("clave", "whaticket_connection_id").maybeSingle();
      if (data?.valor) setConexionId(data.valor);
      const r = await conexionesWhaticket();
      if (r.ok) {
        const b = r.data?.body;
        setConexiones(Array.isArray(b) ? b : b?.whatsapps ?? b?.connections ?? b?.data ?? []);
      } else toast.error("No se pudieron leer las conexiones: " + r.error);
    })();
    cargarEnvios();
  }, []);

  const guardarConexion = async (v: string) => {
    setConexionId(v);
    const valor = v === "none" ? "" : v;
    const { data: ex } = await db.from("fichado_configuracion").select("id").eq("clave", "whaticket_connection_id").maybeSingle();
    const { error } = ex
      ? await db.from("fichado_configuracion").update({ valor }).eq("id", ex.id)
      : await db.from("fichado_configuracion").insert({ clave: "whaticket_connection_id", valor, descripcion: "Conexión Whaticket usada para enviar WhatsApp" });
    error ? toast.error(error.message) : toast.success("Conexión guardada");
  };

  const probar = async () => {
    const r = await probarWhaticket();
    setEstadoApi(r.ok ? "Conectado correctamente" : "Error: " + r.error);
  };

  const enviarPrueba = async () => {
    const r = await enviarWhatsApp("prueba", [{ numero, texto }]);
    r.ok ? toast.success("Enviado") : toast.error(r.error);
    cargarEnvios();
  };

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold">WhatsApp</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Conexión</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={conexionId} onValueChange={guardarConexion}>
              <SelectTrigger><SelectValue placeholder="Elegí la conexión" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin elegir</SelectItem>
                {conexiones.map((c) => (
                  <SelectItem key={String(c.id)} value={String(c.id)}>
                    {c.name ?? c.nome ?? c.id} {c.status ? `(${c.status})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={probar}><PlugZap className="h-4 w-4" /> Probar conexión</Button>
            {estadoApi && <p className="text-sm text-muted-foreground">{estadoApi}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Envío de prueba</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Número (ej. 11 2345 6789)" value={numero} onChange={(e) => setNumero(e.target.value)} />
            <Textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} />
            <Button className="gap-2" disabled={!numero} onClick={enviarPrueba}><Send className="h-4 w-4" /> Enviar</Button>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Registro de envíos</CardTitle>
          <Button size="sm" variant="ghost" onClick={cargarEnvios}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {envios.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay envíos.</p>}
          {envios.map((e) => (
            <div key={e.id} className="rounded border p-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</span>
                <Badge variant="outline">{e.origen}</Badge>
                <span className="font-medium">{e.nombre ?? ""} {e.numero}</span>
                <Badge variant={e.estado === "enviado" ? "default" : "destructive"}>{e.estado}</Badge>
                {e.estado !== "enviado" && (
                  <Button size="sm" variant="outline" onClick={async () => {
                    const r = await reintentarEnvio(e.id);
                    r.ok ? toast.success("Reintentado") : toast.error(r.error);
                    cargarEnvios();
                  }}>Reintentar</Button>
                )}
              </div>
              <p className="mt-1 line-clamp-2 whitespace-pre-wrap">{e.mensaje}</p>
              {e.error && <p className="mt-1 text-xs text-destructive">{e.error}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
