import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarCheck, CheckCircle2, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const db = supabase as any;

interface SlotPublico {
  slot_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
}

const hhmm = (t: string) => t.slice(0, 5);
const fechaLarga = (f: string) => format(new Date(f + "T00:00:00"), "EEEE d 'de' MMMM", { locale: es });

export default function ReservarEntrevista() {
  const { token } = useParams<{ token: string }>();
  const [datos, setDatos] = useState<any>(null);
  const [slots, setSlots] = useState<SlotPublico[]>([]);
  const [elegido, setElegido] = useState<SlotPublico | null>(null);
  const [confirmada, setConfirmada] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [reservando, setReservando] = useState(false);
  const [puestos, setPuestos] = useState<{ id: string; nombre: string }[]>([]);
  const [form, setForm] = useState({ nombre: "", apellido: "", telefono: "", puesto_id: "" });

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    try {
      const { data: info } = await db.rpc("entrevista_datos_invitacion", { _token: token });
      setDatos(info);
      if (info?.valido && !info?.reservada) {
        const { data: libres } = await db.rpc("entrevista_slots_publicos", { _token: token });
        setSlots(libres || []);
        if (info?.tipo === "abierta") {
          const { data: ps } = await db.rpc("entrevista_puestos_publicos", { _token: token });
          setPuestos(ps || []);
        }
      }
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abierta = datos?.tipo === "abierta";

  const reservar = async () => {
    if (!elegido || !token) return;
    if (abierta && (!form.nombre.trim() || !form.telefono.trim())) {
      toast.error("Completá tu nombre y tu teléfono");
      return;
    }
    setReservando(true);
    try {
      const { data, error } = await db.rpc("entrevista_reservar_abierta", {
        _token: token,
        _slot_id: elegido.slot_id,
        _nombre: abierta ? form.nombre : datos?.nombre || "Candidato",
        _apellido: abierta ? form.apellido : "",
        _telefono: abierta ? form.telefono : "",
        _puesto_id: abierta && form.puesto_id ? form.puesto_id : null,
      });
      if (error) throw error;
      if (!data?.ok) {
        if (data?.motivo === "slot_ocupado") {
          toast.error("Ese horario acaba de ser reservado por otra persona. Elegí otro, por favor.");
          setElegido(null);
          const { data: libres } = await db.rpc("entrevista_slots_publicos", { _token: token });
          setSlots(libres || []);
        } else if (data?.motivo === "ya_reservada") {
          toast.error("Tu entrevista ya estaba reservada.");
          cargar();
        } else {
          toast.error("El enlace no es válido o venció.");
        }
        return;
      }
      setConfirmada(data);
    } catch (e: any) {
      toast.error("No se pudo reservar: " + (e.message || e));
    } finally {
      setReservando(false);
    }
  };

  const Encabezado = () => (
    <div className="mb-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">Mayorista Soto</p>
      <h1 className="mt-1 text-2xl font-bold">Coordiná tu entrevista</h1>
    </div>
  );

  if (cargando)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <p className="text-muted-foreground">Cargando…</p>
      </div>
    );

  if (!datos?.valido)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-2 py-10 text-center">
            <h1 className="text-xl font-bold">Enlace no disponible</h1>
            <p className="text-muted-foreground">
              Este enlace no es válido o ya venció. Escribinos para coordinar tu entrevista.
            </p>
          </CardContent>
        </Card>
      </div>
    );

  const yaReservada = confirmada || datos.reservada;
  const info = confirmada ?? datos;

  if (yaReservada)
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-md pt-8">
          <Encabezado />
          <Card>
            <CardContent className="space-y-4 py-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <h2 className="text-xl font-bold">¡Entrevista confirmada!</h2>
              <p className="text-muted-foreground">Tu entrevista quedó confirmada para:</p>
              <p className="text-lg font-semibold capitalize">{fechaLarga(info.fecha)}</p>
              <p className="text-lg font-semibold">{hhmm(info.hora_inicio)} hs</p>
              <div className="pt-2">
                <p className="font-medium">Mayorista Soto</p>
                {info.direccion && (
                  <p className="flex items-center justify-center gap-1 text-muted-foreground">
                    <MapPin className="h-4 w-4" /> {info.direccion}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );

  if (elegido)
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-md pt-8">
          <Encabezado />
          <Card>
            <CardContent className="space-y-4 py-8 text-center">
              <h2 className="text-lg font-bold">Confirmar entrevista</h2>
              <p className="text-lg font-semibold capitalize">{fechaLarga(elegido.fecha)}</p>
              <p className="flex items-center justify-center gap-1 text-lg font-semibold">
                <Clock className="h-4 w-4" /> {hhmm(elegido.hora_inicio)} a {hhmm(elegido.hora_fin)}
              </p>
              {abierta ? (
                <div className="space-y-2 text-left">
                  <p className="text-center text-muted-foreground">Dejanos tus datos para confirmar:</p>
                  <Input
                    placeholder="Nombre"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  />
                  <Input
                    placeholder="Apellido"
                    value={form.apellido}
                    onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                  />
                  <Input
                    placeholder="Teléfono"
                    inputMode="tel"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  />
                  {puestos.length > 0 && (
                    <Select value={form.puesto_id} onValueChange={(v) => setForm({ ...form, puesto_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="¿Para qué puesto te postulás?" />
                      </SelectTrigger>
                      <SelectContent>
                        {puestos.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">¿Querés reservar este horario?</p>
              )}
              <Button className="w-full" size="lg" onClick={reservar} disabled={reservando}>
                {reservando ? "Reservando…" : "Confirmar entrevista"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setElegido(null)}>
                Elegir otro horario
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );

  const porFecha = slots.reduce<Record<string, SlotPublico[]>>((acc, s) => {
    (acc[s.fecha] = acc[s.fecha] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md pt-8 pb-12">
        <Encabezado />
        <Card className="mb-4">
          <CardContent className="space-y-2 py-6">
            <p className="font-semibold">{datos.nombre ? `Hola ${datos.nombre}.` : "¡Hola!"}</p>
            <p className="text-muted-foreground">
              Seleccioná el día y horario que te resulte más cómodo para realizar tu entrevista.
            </p>
          </CardContent>
        </Card>

        {Object.keys(porFecha).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Por el momento no hay horarios disponibles. Volvé a intentar más tarde.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {Object.entries(porFecha).map(([fecha, lista]) => (
              <div key={fecha}>
                <p className="mb-2 font-semibold uppercase">{fechaLarga(fecha)}</p>
                <div className="grid grid-cols-2 gap-2">
                  {lista.map((s) => (
                    <Button
                      key={s.slot_id}
                      variant="outline"
                      size="lg"
                      className="gap-2"
                      onClick={() => setElegido(s)}
                    >
                      <CalendarCheck className="h-4 w-4" /> {hhmm(s.hora_inicio)}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
