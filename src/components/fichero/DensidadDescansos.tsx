import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FilaDescanso, analizarSuperposiciones } from '@/lib/descansosReport'
import { formatArgentinaDate, formatArgentinaTime } from '@/lib/dateUtils'

export const nivelDescanso = (n: number) => n===0?'bg-muted/40 text-muted-foreground':n===1?'bg-accent/15 text-foreground':n===2?'bg-accent/35 text-foreground':n===3?'bg-accent/65 text-foreground':'bg-accent text-accent-foreground'
const hh = (s: string) => formatArgentinaTime(s,'HH:mm:ss')
const fin = (inicio: string, final: string) => formatArgentinaDate(inicio,'yyyy-MM-dd')===formatArgentinaDate(final,'yyyy-MM-dd')?hh(final):'24:00:00'

export default function DensidadDescansos({rows,desde,hasta,empleadoId}:{rows:FilaDescanso[];desde:string;hasta:string;empleadoId?:string}) {
  const dias = useMemo(()=>analizarSuperposiciones(rows,desde,hasta,empleadoId),[rows,desde,hasta,empleadoId])
  const [seleccion,setSeleccion]=useState('')
  const elegido = dias.find(d=>`${d.fecha}|${d.sucursal_id}`===seleccion) ?? dias.find(d=>d.maximo>1) ?? dias[0]
  const superpuestas = elegido?.franjas.filter(f=>f.empleados.length>1) ?? []
  const maximo=Math.max(0,...dias.map(d=>d.maximo))
  return <div className="space-y-4 border-y py-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">Mapa diario de descansos</h3><Badge variant="secondary">Pico: {maximo} simultáneos</Badge></div>
    <p className="text-sm text-muted-foreground">Fichadas reales · Hora Argentina · Máximo simultáneo por hora · Registros incompletos sin duración estimada</p>
    {empleadoId&&<p className="text-sm text-muted-foreground">Coincidencias del empleado seleccionado con sus compañeros de sucursal.</p>}
    <div className="flex flex-wrap gap-4 text-sm"><span>{dias.filter(d=>d.maximo>1).length} días/sucursal con coincidencias</span><span>{dias.reduce((n,d)=>n+d.minutosSuperpuestos,0)} min con 2 o más en descanso</span><span>{dias.reduce((n,d)=>n+d.incompletos,0)} incompletos</span></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[1150px] border-separate border-spacing-1 text-xs"><thead><tr><th className="text-left">Día / sucursal</th>{Array.from({length:24},(_,h)=><th key={h} className="w-8 font-normal text-muted-foreground">{String(h).padStart(2,'0')}</th>)}<th>Pico</th><th>Min ≥2</th></tr></thead><tbody>{dias.map(d=><tr key={`${d.fecha}|${d.sucursal_id}`}><td className="min-w-44"><Button variant="ghost" size="sm" className="h-auto w-full justify-start whitespace-normal text-left" onClick={()=>setSeleccion(`${d.fecha}|${d.sucursal_id}`)} aria-pressed={elegido===d}><span><strong>{d.fecha.split('-').reverse().join('/')}</strong><span className="block text-xs font-normal text-muted-foreground">{d.sucursal}{d.incompletos?` · ${d.incompletos} incompleto(s)`:''}</span></span></Button></td>{d.horas.map((n,h)=><td key={h}><Button variant="ghost" className={`h-7 w-full min-w-8 rounded-sm p-0 text-xs ${nivelDescanso(n)}`} aria-label={`${d.fecha} ${d.sucursal} ${h}:00: ${n} simultáneos`} title={`${String(h).padStart(2,'0')}:00–${String(h+1).padStart(2,'0')}:00 · máximo ${n}`} onClick={()=>setSeleccion(`${d.fecha}|${d.sucursal_id}`)}>{n||'·'}</Button></td>)}<td className="text-center font-semibold">{d.maximo}</td><td className="text-center">{d.minutosSuperpuestos}</td></tr>)}</tbody></table></div>
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">Simultáneos: {[0,1,2,3,4].map(n=><span key={n} className="inline-flex items-center gap-1"><span className={`inline-block h-3 w-3 rounded-sm ${nivelDescanso(n)}`}/>{n===4?'4+':n}</span>)}</div>
    {!dias.length?<p className="text-muted-foreground">Sin descansos para este período y sucursal.</p>:elegido&&<>
      <h4 className="font-semibold">{elegido.fecha.split('-').reverse().join('/')} · {elegido.sucursal} · Superposiciones exactas</h4>
      <Table><TableHeader><TableRow>{['Desde','Hasta','Minutos','Simultáneos','Empleados'].map(t=><TableHead key={t}>{t}</TableHead>)}</TableRow></TableHeader><TableBody>{superpuestas.map(f=><TableRow key={f.inicio}><TableCell className="whitespace-nowrap">{hh(f.inicio)}</TableCell><TableCell>{fin(f.inicio,f.fin)}</TableCell><TableCell>{f.minutos===0?'<1':f.minutos}</TableCell><TableCell>{f.empleados.length}</TableCell><TableCell>{f.empleados.map(p=>p.nombre).join(' · ')}</TableCell></TableRow>)}{!superpuestas.length&&<TableRow><TableCell colSpan={5}>Sin superposiciones comprobadas este día.</TableCell></TableRow>}</TableBody></Table>
      <h4 className="font-semibold">Organización del día · Todas las franjas</h4>
      <Table><TableHeader><TableRow><TableHead>Franja</TableHead><TableHead>Simultáneos</TableHead><TableHead>Empleados</TableHead></TableRow></TableHeader><TableBody>{elegido.franjas.map(f=><TableRow key={f.inicio}><TableCell className="whitespace-nowrap">{hh(f.inicio)} – {fin(f.inicio,f.fin)}</TableCell><TableCell>{f.empleados.length}</TableCell><TableCell>{f.empleados.map(p=>p.nombre).join(' · ')}</TableCell></TableRow>)}</TableBody></Table>
    </>}
  </div>
}