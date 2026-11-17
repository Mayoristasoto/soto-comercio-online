import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, CheckCircle2, Loader2, Upload } from "lucide-react";

const URL_FN = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ats-postular`;
type Busqueda = { id: string; titulo: string; descripcion: string | null; requisitos: string | null; sucursal: string | null };

export default function Postular() {
  const { busquedaId } = useParams();
  const [busquedas, setBusquedas] = useState<Busqueda[]>([]);
  const [sel, setSel] = useState(busquedaId || "none");
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");
  const [consiente, setConsiente] = useState(false);
  const embebido = new URLSearchParams(location.search).has("embed");

  useEffect(() => {
    fetch(URL_FN).then((r) => r.json()).then((j) => setBusquedas(j.busquedas || [])).catch(() => {});
  }, []);

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("consentimiento", String(consiente));
    if (sel !== "none") fd.set("busqueda_id", sel);
    setEnviando(true);
    try {
      const r = await fetch(URL_FN, { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error");
      setOk(true);
      window.parent?.postMessage({ type: "postulacion-enviada" }, "*");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const actual = busquedas.find((b) => b.id === sel);

  return (
    <div className={embebido ? "bg-background p-3" : "min-h-screen bg-muted/40 px-4 py-8"}>
      <div className="mx-auto max-w-xl rounded-xl border bg-card p-5 shadow-sm md:p-7">
        {!embebido && (
          <header className="mb-5 space-y-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-primary"><Briefcase className="h-6 w-6" /> Trabajá con nosotros</h1>
            <p className="text-muted-foreground">Mayorista Soto · Dejanos tus datos y tu CV.</p>
          </header>
        )}
        {ok ? (
          <div className="space-y-3 py-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <h2 className="text-xl font-semibold">¡Recibimos tu postulación!</h2>
            <p className="text-muted-foreground">Recursos Humanos la va a revisar. Si tu perfil coincide con alguna búsqueda, te contactamos.</p>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-4">
            <input name="website" className="hidden" tabIndex={-1} autoComplete="off" />
            <div className="space-y-1.5">
              <Label>Puesto al que te postulás</Label>
              <Select value={sel} onValueChange={setSel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Postulación general</SelectItem>
                  {busquedas.map((b) => <SelectItem key={b.id} value={b.id}>{b.titulo}{b.sucursal ? ` · ${b.sucursal}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
              {actual?.descripcion && <p className="text-sm text-muted-foreground">{actual.descripcion}</p>}
              {actual?.requisitos && <p className="text-sm text-muted-foreground"><b>Requisitos:</b> {actual.requisitos}</p>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Nombre *</Label><Input name="nombre" required maxLength={80} /></div>
              <div className="space-y-1.5"><Label>Apellido *</Label><Input name="apellido" required maxLength={80} /></div>
              <div className="space-y-1.5"><Label>Teléfono / WhatsApp *</Label><Input name="telefono" required maxLength={40} inputMode="tel" /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input name="email" type="email" maxLength={120} /></div>
              <div className="space-y-1.5"><Label>DNI</Label><Input name="dni" maxLength={15} inputMode="numeric" /></div>
              <div className="space-y-1.5"><Label>Localidad</Label><Input name="localidad" maxLength={80} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>CV * (PDF, Word o foto, hasta 10 MB)</Label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted/50">
                <Upload className="h-4 w-4" />
                <input name="cv" type="file" required accept=".pdf,.doc,.docx,image/*" className="w-full text-sm" />
              </label>
            </div>
            <div className="space-y-1.5"><Label>Contanos algo de vos (opcional)</Label><Textarea name="mensaje" maxLength={1000} rows={3} /></div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={consiente} onCheckedChange={(v) => setConsiente(!!v)} className="mt-0.5" />
              <span>Acepto que Mayorista Soto guarde mis datos y mi CV para esta y futuras búsquedas de personal (Ley 25.326).</span>
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={enviando || !consiente}>
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar postulación"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
