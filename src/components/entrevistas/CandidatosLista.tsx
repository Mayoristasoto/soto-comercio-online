import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarPlus, Plus, Search } from "lucide-react";
import {
  CANDIDATO_ESTADO_LABEL,
  Candidato,
  CandidatoEstado,
  PuestoReclutamiento,
} from "./entrevistasTypes";
import ImportarCandidatosDialog from "./ImportarCandidatosDialog";
import InvitarCandidatoDialog from "./InvitarCandidatoDialog";

const db = supabase as any;

export default function CandidatosLista({
  soloLectura,
  onInvitado,
}: {
  soloLectura?: boolean;
  onInvitado?: () => void;
}) {
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [puestos, setPuestos] = useState<PuestoReclutamiento[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroPuesto, setFiltroPuesto] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [invitando, setInvitando] = useState<Candidato | null>(null);
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: "", apellido: "", telefono: "", email: "", puesto_id: "none" });
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [{ data: cs }, { data: ps }] = await Promise.all([
        db.from("candidatos").select("*").order("created_at", { ascending: false }).limit(1000),
        db.from("reclutamiento_puestos").select("*").order("orden"),
      ]);
      setCandidatos(cs || []);
      setPuestos(ps || []);
    } catch (e: any) {
      toast.error("No se pudieron cargar los candidatos: " + (e.message || e));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crear = async () => {
    if (!nuevo.nombre.trim()) return toast.error("El nombre es obligatorio");
    const { data: user } = await supabase.auth.getUser();
    const { error } = await db.from("candidatos").insert({
      nombre: nuevo.nombre.trim(),
      apellido: nuevo.apellido.trim() || null,
      telefono: nuevo.telefono.trim() || null,
      email: nuevo.email.trim() || null,
      puesto_id: nuevo.puesto_id === "none" ? null : nuevo.puesto_id,
      creado_por: user?.user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success("Candidato agregado");
    setNuevo({ nombre: "", apellido: "", telefono: "", email: "", puesto_id: "none" });
    setNuevoAbierto(false);
    cargar();
  };

  const cambiarEstado = async (c: Candidato, estado: CandidatoEstado) => {
    const { error } = await db.from("candidatos").update({ estado }).eq("id", c.id);
    if (error) return toast.error(error.message);
    setCandidatos((prev) => prev.map((x) => (x.id === c.id ? { ...x, estado } : x)));
  };

  const nombrePuesto = (id: string | null) => puestos.find((p) => p.id === id)?.nombre ?? "Sin puesto";

  const filtrados = candidatos.filter((c) => {
    const texto = `${c.nombre} ${c.apellido ?? ""} ${c.telefono ?? ""} ${c.email ?? ""}`.toLowerCase();
    return (
      texto.includes(busqueda.toLowerCase()) &&
      (filtroPuesto === "todos" || c.puesto_id === filtroPuesto) &&
      (filtroEstado === "todos" || c.estado === filtroEstado)
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Candidatos</CardTitle>
        <CardDescription>Base de candidatos para invitar a entrevista.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="w-56 pl-8"
                placeholder="Nombre, teléfono o email"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Puesto</Label>
            <Select value={filtroPuesto} onValueChange={setFiltroPuesto}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {puestos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Estado</Label>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {Object.entries(CANDIDATO_ESTADO_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!soloLectura && (
            <div className="ml-auto flex gap-2">
              <ImportarCandidatosDialog puestos={puestos} onImportado={cargar} />
              <Dialog open={nuevoAbierto} onOpenChange={setNuevoAbierto}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" /> Nuevo candidato
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuevo candidato</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Nombre</Label>
                      <Input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Apellido</Label>
                      <Input
                        value={nuevo.apellido}
                        onChange={(e) => setNuevo({ ...nuevo, apellido: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Teléfono</Label>
                      <Input
                        value={nuevo.telefono}
                        onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <Input value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Puesto</Label>
                      <Select
                        value={nuevo.puesto_id}
                        onValueChange={(v) => setNuevo({ ...nuevo, puesto_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin puesto</SelectItem>
                          {puestos.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={crear}>Guardar candidato</Button>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        <div className="overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidato</TableHead>
                <TableHead>Puesto</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                {!soloLectura && <TableHead className="text-right">Acción</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {cargando ? (
                <TableRow>
                  <TableCell colSpan={5}>Cargando…</TableCell>
                </TableRow>
              ) : filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Todavía no hay candidatos cargados.
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.nombre} {c.apellido ?? ""}
                      {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                    </TableCell>
                    <TableCell>{nombrePuesto(c.puesto_id)}</TableCell>
                    <TableCell>{c.telefono ?? "—"}</TableCell>
                    <TableCell>
                      {soloLectura ? (
                        <Badge variant="secondary">{CANDIDATO_ESTADO_LABEL[c.estado]}</Badge>
                      ) : (
                        <Select value={c.estado} onValueChange={(v) => cambiarEstado(c, v as CandidatoEstado)}>
                          <SelectTrigger className="w-52">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(CANDIDATO_ESTADO_LABEL).map(([k, v]) => (
                              <SelectItem key={k} value={k}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    {!soloLectura && (
                      <TableCell className="text-right">
                        <Button size="sm" className="gap-2" onClick={() => setInvitando(c)}>
                          <CalendarPlus className="h-4 w-4" /> Invitar a entrevista
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <InvitarCandidatoDialog
        candidato={invitando}
        puestoNombre={nombrePuesto(invitando?.puesto_id ?? null)}
        onClose={() => setInvitando(null)}
        onInvitado={() => {
          cargar();
          onInvitado?.();
        }}
      />
    </Card>
  );
}
