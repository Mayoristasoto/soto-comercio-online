import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Copy, Link2, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Invitacion,
  PuestoReclutamiento,
  enlaceReserva,
  mensajeWhatsapp,
} from "./entrevistasTypes";

const db = supabase as any;

export default function InvitacionesPendientes({
  soloLectura,
  refrescar,
}: {
  soloLectura?: boolean;
  refrescar?: number;
}) {
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [puestos, setPuestos] = useState<PuestoReclutamiento[]>([]);
  const [plantilla, setPlantilla] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [{ data: inv }, { data: ps }, { data: cfgs }] = await Promise.all([
        db
          .from("entrevistas_invitaciones")
          .select("*, candidatos(nombre, apellido, telefono, puesto_id)")
          .order("invited_at", { ascending: false })
          .limit(300),
        db.from("reclutamiento_puestos").select("*").order("orden"),
        db.from("entrevistas_config").select("mensaje_whatsapp").order("created_at").limit(1),
      ]);
      setInvitaciones(inv || []);
      setPuestos(ps || []);
      setPlantilla(cfgs?.[0]?.mensaje_whatsapp ?? null);
    } catch (e: any) {
      toast.error("No se pudieron cargar las invitaciones: " + (e.message || e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar, refrescar]);

  const nombrePuesto = (id: string | null | undefined) =>
    puestos.find((p) => p.id === id)?.nombre ?? "Sin puesto";

  const copiar = async (texto: string, aviso: string) => {
    await navigator.clipboard.writeText(texto);
    toast.success(aviso);
  };

  const generarEnlacePublico = async () => {
    try {
      const { data: cfgs } = await db.from("entrevistas_config").select("id").order("created_at").limit(1);
      const { data: nuevoToken, error: errToken } = await db.rpc("entrevista_generar_token");
      if (errToken) throw errToken;
      const { data: user } = await supabase.auth.getUser();
      const { error } = await db.from("entrevistas_invitaciones").insert({
        config_id: cfgs?.[0]?.id ?? null,
        token: nuevoToken,
        tipo: "abierta",
        creado_por: user?.user?.id ?? null,
      });
      if (error) throw error;
      await navigator.clipboard.writeText(enlaceReserva(nuevoToken as string));
      toast.success("Enlace público copiado. Sirve para una sola reserva.");
      cargar();
    } catch (e: any) {
      toast.error("No se pudo generar el enlace: " + (e.message || e));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>Invitaciones</CardTitle>
          <CardDescription>Enlaces generados y su estado de reserva.</CardDescription>
        </div>
        {!soloLectura && (
          <Button onClick={generarEnlacePublico} className="gap-2">
            <Link2 className="h-4 w-4" /> Generar enlace público (un solo uso)
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidato</TableHead>
                <TableHead>Puesto</TableHead>
                <TableHead>Enviada</TableHead>
                <TableHead>Estado</TableHead>
                {!soloLectura && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {cargando ? (
                <TableRow>
                  <TableCell colSpan={5}>Cargando…</TableCell>
                </TableRow>
              ) : invitaciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Todavía no generaste invitaciones.
                  </TableCell>
                </TableRow>
              ) : (
                invitaciones.map((i) => {
                  const vencida = new Date(i.expira_at) < new Date();
                  const puesto = nombrePuesto(i.candidatos?.puesto_id);
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">
                        {i.candidatos?.nombre
                          ? `${i.candidatos.nombre} ${i.candidatos.apellido ?? ""}`
                          : "Enlace público (sin asignar)"}
                        {i.candidatos?.telefono && (
                          <div className="text-xs text-muted-foreground">{i.candidatos.telefono}</div>
                        )}
                      </TableCell>
                      <TableCell>{puesto}</TableCell>
                      <TableCell>{format(new Date(i.invited_at), "dd/MM/yyyy HH:mm", { locale: es })}</TableCell>
                      <TableCell>
                        {i.entrevista_id ? (
                          <Badge>Entrevista reservada</Badge>
                        ) : vencida ? (
                          <Badge variant="destructive">Vencida</Badge>
                        ) : (
                          <Badge variant="secondary">Pendiente de reserva</Badge>
                        )}
                      </TableCell>
                      {!soloLectura && (
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() =>
                                copiar(
                                  mensajeWhatsapp(i.candidatos?.nombre ?? "", puesto, i.token, plantilla),
                                  "Mensaje copiado"
                                )
                              }
                            >
                              <Copy className="h-3 w-3" /> Mensaje
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => copiar(enlaceReserva(i.token), "Enlace copiado")}
                            >
                              <Link2 className="h-3 w-3" /> Enlace
                            </Button>
                            <Button size="sm" variant="secondary" className="gap-1" disabled title="Próximamente">
                              <MessageCircle className="h-3 w-3" /> WhatsApp
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
