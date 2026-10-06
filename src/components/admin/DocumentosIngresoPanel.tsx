import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

/** Estado de firmas (reglamento + descripción de puesto) y carga de descripciones por puesto. */
export function DocumentosIngresoPanel() {
  const [firmas, setFirmas] = useState<any[]>([])
  const [puestos, setPuestos] = useState<any[]>([])
  const [descs, setDescs] = useState<any[]>([])
  const [puestoId, setPuestoId] = useState("none")
  const [file, setFile] = useState<File | null>(null)
  const [filtro, setFiltro] = useState("")
  const [subiendo, setSubiendo] = useState(false)

  const cargar = async () => {
    const { data: f } = await (supabase as any).rpc("estado_firmas_reglamento"); setFirmas(f ?? [])
    const { data: p } = await supabase.from("puestos").select("id, nombre").order("nombre"); setPuestos(p ?? [])
    const { data: d } = await (supabase as any).from("documentos_obligatorios").select("id, titulo, url_archivo, puesto_id").eq("tipo_documento", "descripcion_puesto").eq("activo", true); setDescs(d ?? [])
  }
  useEffect(() => { cargar() }, [])

  const subir = async () => {
    if (puestoId === "none" || !file) return toast.error("Elegí el puesto y el archivo")
    setSubiendo(true)
    try {
      const path = `descripciones-puesto/${puestoId}-${Date.now()}.${file.name.split(".").pop()}`
      const { error: e1 } = await supabase.storage.from("mandatory-documents").upload(path, file)
      if (e1) throw e1
      const url = supabase.storage.from("mandatory-documents").getPublicUrl(path).data.publicUrl
      const nombre = puestos.find((p) => p.id === puestoId)?.nombre
      await (supabase as any).from("documentos_obligatorios").update({ activo: false }).eq("tipo_documento", "descripcion_puesto").eq("puesto_id", puestoId)
      const { error } = await (supabase as any).from("documentos_obligatorios").insert({ titulo: `Descripción de puesto - ${nombre}`, tipo_documento: "descripcion_puesto", puesto_id: puestoId, url_archivo: url, activo: true })
      if (error) throw error
      toast.success("Descripción cargada"); setFile(null); cargar()
    } catch (e: any) { toast.error(e.message) } finally { setSubiendo(false) }
  }

  const reg = firmas.filter((f) => f.reglamento).length
  const pue = firmas.filter((f) => f.descripcion_puesto).length
  const lista = firmas.filter((f) => !(f.reglamento && f.descripcion_puesto) && (!filtro || `${f.nombre} ${f.sucursal} ${f.puesto}`.toLowerCase().includes(filtro.toLowerCase())))

  return (
    <Card>
      <CardHeader><CardTitle>Reglamento y descripción de puesto</CardTitle>
        <CardDescription>Reglamento firmado: {reg} de {firmas.length} · Descripción de puesto firmada: {pue} de {firmas.length}. Empleados sin puesto asignado: {firmas.filter((f) => !f.puesto).length}.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">Cargar descripción de un puesto</p>
          <div className="flex flex-wrap gap-2">
            <Select value={puestoId} onValueChange={setPuestoId}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Puesto" /></SelectTrigger>
              <SelectContent><SelectItem value="none">Elegí el puesto</SelectItem>{puestos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="file" accept=".pdf,.doc,.docx" className="w-72" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Button onClick={subir} disabled={subiendo}>{subiendo ? "Subiendo..." : "Subir"}</Button>
          </div>
          <div className="flex flex-wrap gap-1">{puestos.map((p) => {
            const d = descs.find((x) => x.puesto_id === p.id)
            return <Badge key={p.id} variant={d ? "default" : "outline"}>{p.nombre}: {d ? "cargada" : "falta"}</Badge>
          })}</div>
        </div>
        <Input placeholder="Buscar pendientes por nombre, sucursal o puesto" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        <div className="max-h-72 overflow-auto text-sm">
          {lista.map((p) => (
            <div key={p.empleado_id} className="flex items-center justify-between gap-2 border-b py-1">
              <span>{p.nombre} <span className="text-muted-foreground">· {p.sucursal || "-"} · {p.puesto || "sin puesto"}</span></span>
              <span className="flex gap-1">
                <Badge variant={p.reglamento ? "default" : "secondary"}>Reglamento</Badge>
                <Badge variant={p.descripcion_puesto ? "default" : "secondary"}>{p.tiene_descripcion ? "Puesto" : "Puesto (sin doc)"}</Badge>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
