import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Download, FileText, Loader2, RefreshCw } from 'lucide-react'
import { getArgentinaStartOfDay, getArgentinaEndOfDay, formatArgentinaDate, formatArgentinaTime } from '@/lib/dateUtils'
import { calcularDescansos, resumirDescansos, MarcaDescanso, EmpleadoDescanso, AsignacionDescanso, ExcesoDescanso } from '@/lib/descansosReport'
import { exportDescansosPDF, exportDescansosXLSX } from '@/utils/descansosExport'
import DensidadDescansos from './DensidadDescansos'

export default function ReporteDescansos() {
  const hoy = formatArgentinaDate(new Date().toISOString(),'yyyy-MM-dd')
  const [desde,setDesde]=useState(`${hoy.slice(0,7)}-01`)
  const [hasta,setHasta]=useState(hoy)
  const [sucursal,setSucursal]=useState('todas')
  const [empleado,setEmpleado]=useState('todos')
  const [estado,setEstado]=useState('todos')
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [marcas,setMarcas]=useState<MarcaDescanso[]>([])
  const [empleados,setEmpleados]=useState<EmpleadoDescanso[]>([])
  const [sucursales,setSucursales]=useState<{id:string;nombre:string}[]>([])
  const [asignaciones,setAsignaciones]=useState<AsignacionDescanso[]>([])
  const [excesos,setExcesos]=useState<ExcesoDescanso[]>([])
  const [periodo,setPeriodo]=useState({desde,hasta})
  const [pagina,setPagina]=useState(0)
  const valido=!!desde&&!!hasta&&desde<=hasta
  const pendiente=desde!==periodo.desde||hasta!==periodo.hasta
  async function cargar() {
    if(!valido) return
    setLoading(true);setError('')
    try {
      const [emps,sucs,asigs]=await Promise.all([
        supabase.from('empleados').select('id,nombre,apellido,sucursal_id,puesto,puestos:puesto_id(nombre)').order('apellido'),
        supabase.from('sucursales').select('id,nombre').order('nombre'),
        supabase.from('empleado_turnos').select('empleado_id,fecha_inicio,fecha_fin,turno:fichado_turnos(dias_semana,duracion_pausa_minutos)').lte('fecha_inicio',hasta).or(`fecha_fin.is.null,fecha_fin.gte.${desde}`)
      ])
      if(emps.error) throw emps.error
      if(sucs.error) throw sucs.error
      if(asigs.error) throw asigs.error
      const all:MarcaDescanso[]=[]
      // Read one extra day on either side to resolve pauses crossing midnight.
      const inicio=new Date(`${desde}T00:00:00`);inicio.setDate(inicio.getDate()-1)
      const fin=new Date(`${hasta}T00:00:00`);fin.setDate(fin.getDate()+1)
      for(let n=0;;n+=1000){
        const {data,error}=await supabase.from('fichajes').select('id,empleado_id,tipo,timestamp_real').neq('estado','rechazado').gte('timestamp_real',getArgentinaStartOfDay(inicio)).lte('timestamp_real',getArgentinaEndOfDay(fin)).order('timestamp_real').order('id').range(n,n+999)
        if(error) throw error
        all.push(...(data??[]));if((data?.length??0)<1000)break
      }
      const exc:ExcesoDescanso[]=[]
      for(let n=0;;n+=1000){
        const {data,error}=await supabase.from('fichajes_pausas_excedidas').select('empleado_id,fecha_fichaje,hora_inicio_pausa,justificado').gte('fecha_fichaje',desde).lte('fecha_fichaje',hasta).order('id').range(n,n+999)
        if(error)throw error
        exc.push(...(data??[]));if((data?.length??0)<1000)break
      }
      setEmpleados((emps.data??[]).map(e=>({...e,puesto:e.puestos?.nombre??e.puesto})))
      setSucursales(sucs.data??[]);setAsignaciones(asigs.data??[]);setMarcas(all);setExcesos(exc);setPeriodo({desde,hasta});setPagina(0)
    } catch(e) {setError(e instanceof Error?e.message: 'No se pudo cargar el reporte. Intentá nuevamente.')} finally {setLoading(false)}
  }
  useEffect(()=>{void cargar()},[])
  const densidadRows=useMemo(()=>calcularDescansos(marcas,empleados,sucursales,asignaciones,excesos,periodo.desde,periodo.hasta).filter(f=>sucursal==='todas'||f.sucursal_id===sucursal),[marcas,empleados,sucursales,asignaciones,excesos,periodo,sucursal])
  const rows=useMemo(()=>densidadRows.filter(f=>(empleado==='todos'||f.empleado_id===empleado)&&(estado==='todos'||(estado==='excesos'?(f.exceso??0)>0:f.estado!=='Completo'))),[densidadRows,empleado,estado])
  const resumen=useMemo(()=>resumirDescansos(rows),[rows])
  const sucNombre=sucursal==='todas'?'Todas las sucursales':sucursales.find(s=>s.id===sucursal)?.nombre??'Sucursal'
  const paginas=Math.max(1,Math.ceil(rows.length/50))
  const actual=Math.min(pagina,paginas-1)
  const descargar=!loading&&!error&&!pendiente&&rows.length>0
  return <section className="space-y-6 rounded-lg bg-background p-4 md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-semibold">Descansos</h2><div className="flex gap-2"><Button variant="outline" disabled={!descargar} onClick={()=>exportDescansosXLSX(rows,periodo.desde,periodo.hasta,sucNombre,densidadRows,empleado==='todos'?undefined:empleado)}><Download className="mr-2 h-4 w-4"/>Excel</Button><Button variant="outline" disabled={!descargar} onClick={()=>exportDescansosPDF(rows,periodo.desde,periodo.hasta,sucNombre,densidadRows,empleado==='todos'?undefined:empleado)}><FileText className="mr-2 h-4 w-4"/>PDF</Button></div></div>
    <div className="flex flex-wrap items-end gap-3">
      <div><Label htmlFor="desc-desde">Desde</Label><Input id="desc-desde" type="date" value={desde} onChange={e=>setDesde(e.target.value)}/></div>
      <div><Label htmlFor="desc-hasta">Hasta</Label><Input id="desc-hasta" type="date" value={hasta} onChange={e=>setHasta(e.target.value)}/></div>
      <div className="w-full sm:w-48"><Label>Sucursal</Label><Select value={sucursal} onValueChange={v=>{setSucursal(v);setEmpleado('todos');setPagina(0)}}><SelectTrigger aria-label="Sucursal"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="todas">Todas</SelectItem>{sucursales.map(s=><SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent></Select></div>
      <div className="w-full sm:w-64"><Label>Empleado</Label><Select value={empleado} onValueChange={v=>{setEmpleado(v);setPagina(0)}}><SelectTrigger aria-label="Empleado"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem>{empleados.filter(e=>sucursal==='todas'||e.sucursal_id===sucursal).map(e=><SelectItem key={e.id} value={e.id}>{e.apellido}, {e.nombre}</SelectItem>)}</SelectContent></Select></div>
      <div className="w-full sm:w-48"><Label>Registros</Label><Select value={estado} onValueChange={v=>{setEstado(v);setPagina(0)}}><SelectTrigger aria-label="Registros"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="excesos">Con exceso</SelectItem><SelectItem value="incompletos">Incompletos</SelectItem></SelectContent></Select></div>
      <Button onClick={()=>void cargar()} disabled={loading||!valido}><RefreshCw className="mr-2 h-4 w-4"/>Consultar</Button>
    </div>
    {!valido&&<p className="text-destructive">Ingresá fechas válidas; Desde no puede ser posterior a Hasta.</p>}
    {error?<div role="alert" className="text-destructive">{error}</div>:loading?<div className="flex items-center gap-2 py-8"><Loader2 className="h-5 w-5 animate-spin"/>Cargando descansos…</div>:<>
      {pendiente&&<p className="text-muted-foreground">Fechas pendientes de consulta.</p>}
      <DensidadDescansos rows={densidadRows} desde={periodo.desde} hasta={periodo.hasta} empleadoId={empleado==='todos'?undefined:empleado}/>
      <div className="flex flex-wrap gap-6 border-y py-4"><div><p className="text-sm text-muted-foreground">Completos</p><strong className="text-xl">{resumen.reduce((n,r)=>n+r.completos,0)}</strong></div><div><p className="text-sm text-muted-foreground">Incompletos</p><strong className="text-xl">{resumen.reduce((n,r)=>n+r.incompletos,0)}</strong></div><div><p className="text-sm text-muted-foreground">Excesos observados</p><strong className="text-xl">{resumen.reduce((n,r)=>n+r.excesos,0)}</strong></div><div><p className="text-sm text-muted-foreground">Minutos de exceso</p><strong className="text-xl">{resumen.reduce((n,r)=>n+r.minutosExceso,0)}</strong></div></div>
      <div><h3 className="mb-2 font-semibold">Resumen por empleado</h3><Table><TableHeader><TableRow>{['Empleado','Sucursal','Completos','Incompletos','Promedio (min)','Excesos','Min de exceso','Justificados'].map(t=><TableHead key={t}>{t}</TableHead>)}</TableRow></TableHeader><TableBody>{resumen.map(r=><TableRow key={r.empleado_id}><TableCell>{r.empleado}</TableCell><TableCell>{r.sucursal}</TableCell><TableCell>{r.completos}</TableCell><TableCell>{r.incompletos}</TableCell><TableCell>{r.promedio??'—'}</TableCell><TableCell>{r.excesos}</TableCell><TableCell>{r.minutosExceso}</TableCell><TableCell>{r.justificados}</TableCell></TableRow>)}</TableBody></Table></div>
      <div><h3 className="mb-2 font-semibold">Detalle · {periodo.desde} al {periodo.hasta}</h3><Table><TableHeader><TableRow>{['Fecha','Sucursal','Empleado','Inicio','Regreso','Minutos','Permitido','Exceso','Estado'].map(t=><TableHead key={t}>{t}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.slice(actual*50,actual*50+50).map(f=><TableRow key={f.id}><TableCell className="whitespace-nowrap">{f.fecha.split('-').reverse().join('/')}</TableCell><TableCell>{f.sucursal}</TableCell><TableCell>{f.empleado}</TableCell><TableCell>{f.inicio?formatArgentinaTime(f.inicio):'—'}</TableCell><TableCell>{f.fin?formatArgentinaDate(f.fin,'dd/MM HH:mm:ss'):'—'}</TableCell><TableCell>{f.minutos??'—'}</TableCell><TableCell>{f.permitido??'Sin turno'}</TableCell><TableCell className={(f.exceso??0)>0?'font-medium text-destructive':''}>{f.exceso??'—'}</TableCell><TableCell><Badge variant={f.estado==='Completo'?'secondary':'outline'}>{f.justificado?'Justificado':f.estado}</Badge></TableCell></TableRow>)}{!rows.length&&<TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Sin descansos registrados para estos filtros.</TableCell></TableRow>}</TableBody></Table><div className="mt-3 flex items-center justify-end gap-3"><span className="text-sm text-muted-foreground">{rows.length} registros · Página {actual+1} de {paginas}</span><Button variant="outline" disabled={!actual} onClick={()=>setPagina(actual-1)}>Anterior</Button><Button variant="outline" disabled={actual>=paginas-1} onClick={()=>setPagina(actual+1)}>Siguiente</Button></div></div>
    </>}
  </section>
}