import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, UserPlus, RefreshCw, KeyRound } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  PERMISOS_POR_DEFECTO,
  PERMISOS_TELEGRAM,
  esCodigoValido,
  resumenPermisos,
  type PermisosTelegram,
} from "@/lib/telegramAccesos"

type Autorizado = PermisosTelegram & {
  chat_id: string
  empleado_id: string
  activo: boolean
  autorizado_por: string | null
  empleados: { nombre: string; apellido: string; legajo: string | null } | null
}

type Solicitud = { chat_id: string; nombre: string | null; username: string | null; visto: boolean }
type Empleado = { id: string; nombre: string; apellido: string; legajo: string | null }

export default function ConfigTelegramAccesos() {
  const { toast } = useToast()
  const [autorizados, setAutorizados] = useState<Autorizado[]>([])
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [codigo, setCodigo] = useState("")
  const [filtro, setFiltro] = useState("")
  const [sel, setSel] = useState<Empleado | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    const db = supabase as any
    const [{ data: a }, { data: s }, { data: e }] = await Promise.all([
      db.from("telegram_autorizados").select("*, empleados!inner(nombre, apellido, legajo)").order("created_at"),
      db.from("telegram_solicitudes").select("*").eq("visto", false).order("updated_at", { ascending: false }),
      db.from("empleados").select("id, nombre, apellido, legajo").eq("activo", true).order("apellido").limit(500),
    ])
    setAutorizados((a || []) as Autorizado[])
    setSolicitudes((s || []) as Solicitud[])
    setEmpleados((e || []) as Empleado[])
  }
  useEffect(() => { cargar() }, [])

  const coincidencias = useMemo(() => {
    const f = filtro.trim().toLowerCase()
    if (!f) return []
    return empleados
      .filter((e) => `${e.apellido} ${e.nombre} ${e.legajo ?? ""}`.toLowerCase().includes(f))
      .slice(0, 8)
  }, [empleados, filtro])

  const cambiarPermiso = async (chat_id: string, clave: keyof PermisosTelegram | "activo", valor: boolean) => {
    setAutorizados((p) => p.map((x) => (x.chat_id === chat_id ? { ...x, [clave]: valor } : x)))
    const { error } = await (supabase as any).from("telegram_autorizados").update({ [clave]: valor }).eq("chat_id", chat_id)
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" })
  }

  const quitarAcceso = async (a: Autorizado) => {
    const nombre = a.empleados ? `${a.empleados.apellido}, ${a.empleados.nombre}` : a.chat_id
    if (!confirm(`¿Quitarle el acceso al bot a ${nombre}?`)) return
    const { error } = await (supabase as any).from("telegram_autorizados").delete().eq("chat_id", a.chat_id)
    if (error) return toast({ title: "No se pudo quitar", description: error.message, variant: "destructive" })
    setAutorizados((p) => p.filter((x) => x.chat_id !== a.chat_id))
    toast({ title: "Acceso quitado", description: nombre })
  }

  const autorizar = async () => {
    const cod = codigo.trim()
    if (!esCodigoValido(cod)) {
      toast({ title: "Código inválido", description: "El código es solo números. Te lo da el bot cuando le escriben." })
      return
    }
    if (!sel) {
      toast({ title: "Falta el empleado", description: "Buscá y elegí a quién le corresponde ese acceso." })
      return
    }
    setGuardando(true)
    const { error } = await (supabase as any).from("telegram_autorizados").insert({
      chat_id: cod, empleado_id: sel.id, autorizado_por: null, ...PERMISOS_POR_DEFECTO,
    })
    setGuardando(false)
    if (error) {
      toast({
        title: error.code === "23505" ? "Ese código ya está autorizado" : "No se pudo autorizar",
        description: error.code === "23505" ? "Cargá primero /quitar desde el chat o editá la persona existente." : error.message,
        variant: "destructive",
      })
      return
    }
    await (supabase as any).from("telegram_solicitudes").update({ visto: true }).eq("chat_id", cod)
    toast({ title: "Autorizado", description: `${sel.apellido}, ${sel.nombre} — permisos: ${resumenPermisos(PERMISOS_POR_DEFECTO)}` })
    setCodigo("")
    setSel(null)
    setFiltro("")
    cargar()
  }

  const ignorarSolicitud = async (s: Solicitud) => {
    await (supabase as any).from("telegram_solicitudes").update({ visto: true }).eq("chat_id", s.chat_id)
    setSolicitudes((p) => p.filter((x) => x.chat_id !== s.chat_id))
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Bot de Telegram — accesos</CardTitle>
            <CardDescription>
              Elegí quién puede escribirle al bot y qué puede hacer cada uno. Las notas que cargue cada persona
              quedan a su nombre, no al tuyo.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={cargar}><RefreshCw className="h-4 w-4 mr-1" />Actualizar</Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-semibold">Cómo te pasan el código</p>
            <p className="text-muted-foreground mt-1">
              La persona le escribe cualquier cosa al bot. Como no está autorizada, el bot le contesta con su
              código (solo números) y le dice que te lo pase. Vos lo pegás acá, elegís el empleado y autorizás.
              También podés escribirlo desde el chat con <code>/permitir codigo Apellido</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      {solicitudes.length > 0 && (
        <Card className="border-accent">
          <CardHeader>
            <CardTitle className="text-base">Pidieron acceso ({solicitudes.length})</CardTitle>
            <CardDescription>La gente que le escribió al bot sin estar autorizada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {solicitudes.map((s) => (
              <div key={s.chat_id} className="flex flex-wrap items-center gap-2 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.nombre || "Sin nombre"}{s.username ? ` (@${s.username})` : ""}</p>
                  <p className="text-xs text-muted-foreground">Código <code>{s.chat_id}</code></p>
                </div>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setCodigo(s.chat_id); setFiltro(s.nombre ?? ""); }}>
                    <KeyRound className="h-4 w-4 mr-1" />Autorizar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => ignorarSolicitud(s)}>Descartar</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Autorizar a alguien nuevo</CardTitle>
          <CardDescription>Código del bot + la persona del legajo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Código de Telegram</Label>
              <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="123456789" inputMode="numeric" />
              <p className="mt-1 text-xs text-muted-foreground">Solo números. Te lo pasa la persona.</p>
            </div>
            <div>
              <Label>Buscar empleado</Label>
              <Input value={filtro} onChange={(e) => { setFiltro(e.target.value); setSel(null); }} placeholder="Apellido, nombre o legajo" />
            </div>
          </div>

          {sel ? (
            <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 p-3">
              <Badge variant="default">{sel.apellido}, {sel.nombre}</Badge>
              <span className="text-sm text-muted-foreground">legajo {sel.legajo ?? "s/d"}</span>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSel(null)}>Cambiar</Button>
            </div>
          ) : coincidencias.length > 0 ? (
            <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border p-2">
              {coincidencias.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-muted"
                  onClick={() => { setSel(e); setFiltro(""); }}
                >
                  <span className="font-medium">{e.apellido}, {e.nombre}</span>
                  <span className="text-xs text-muted-foreground">legajo {e.legajo ?? "s/d"}</span>
                </button>
              ))}
            </div>
          ) : filtro ? (
            <p className="text-sm text-muted-foreground">No encontré empleados con "{filtro}".</p>
          ) : null}

          <Button onClick={autorizar} disabled={guardando}>
            <UserPlus className="h-4 w-4 mr-1" />{guardando ? "Autorizando..." : "Autorizar"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Autorizados ({autorizados.length})</CardTitle>
          <CardDescription>Apagá un permiso y esa persona no podrá usar ese comando.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {autorizados.length === 0 && (
            <p className="text-sm text-muted-foreground">Todavía no autorizaste a nadie.</p>
          )}
          {autorizados.map((a) => (
            <div key={a.chat_id} className={`rounded-md border p-3 ${a.activo ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Switch checked={a.activo} onCheckedChange={(v) => cambiarPermiso(a.chat_id, "activo", v)} />
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {a.empleados ? `${a.empleados.apellido}, ${a.empleados.nombre}` : "Empleado dado de baja"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Código <code>{a.chat_id}</code> · {resumenPermisos(a)}
                  </p>
                </div>
                <Button size="icon" variant="ghost" className="ml-auto" onClick={() => quitarAcceso(a)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {PERMISOS_TELEGRAM.map((p) => (
                  <label key={p.clave} className="flex items-center gap-2 rounded-md bg-muted px-2 py-1.5">
                    <Switch
                      checked={a[p.clave] === true}
                      onCheckedChange={(v) => cambiarPermiso(a.chat_id, p.clave, v)}
                    />
                    <span className="text-sm">{p.etiqueta}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
