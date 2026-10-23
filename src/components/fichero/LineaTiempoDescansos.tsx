import { DiaDescanso } from '@/lib/descansosReport'
import { getArgentinaStartOfDay, formatArgentinaTime } from '@/lib/dateUtils'

export default function LineaTiempoDescansos({dia}:{dia:DiaDescanso}) {
  const personas=[...new Map(dia.franjas.flatMap(f=>f.empleados.map(p=>[p.id,p] as const))).values()].sort((a,b)=>a.nombre.localeCompare(b.nombre))
  const inicio=Date.parse(getArgentinaStartOfDay(new Date(`${dia.fecha}T00:00:00`)))
  const min=Math.max(0,Math.floor(Math.min(24,...dia.franjas.map(f=>(Date.parse(f.inicio)-inicio)/3600000))))
  const max=Math.min(24,Math.max(min+1,Math.ceil(Math.max(0,...dia.franjas.map(f=>(Date.parse(f.fin)-inicio)/3600000)))))
  const left=260,width=900,step=width/(max-min)
  return <div className="overflow-x-auto" aria-label="Línea de tiempo de descansos por empleado">
    <svg viewBox={`0 0 1180 ${50+personas.length*48}`} className="w-full min-w-[1000px] text-foreground" role="img" aria-label={`Descansos por empleado ${dia.fecha} ${dia.sucursal}`}>
      {Array.from({length:max-min+1},(_,i)=><g key={i}><text x={left+i*step} y={18} textAnchor="middle" className="fill-current text-xs">{String(min+i).padStart(2,'0')}:00</text><line x1={left+i*step} x2={left+i*step} y1={28} y2={40+personas.length*48} className="stroke-border"/></g>)}
      {personas.map((p,i)=><g key={p.id}><text x={8} y={54+i*48} className="fill-current text-xs">{p.nombre.length>34?`${p.nombre.slice(0,33)}…`:p.nombre}<title>{p.nombre}</title></text><line x1={0} x2={1160} y1={76+i*48} y2={76+i*48} className="stroke-border"/>{dia.franjas.filter(f=>f.empleados.some(e=>e.id===p.id)).map(f=><rect key={f.inicio} x={left+((Date.parse(f.inicio)-inicio)/3600000-min)*step} y={35+i*48} width={Math.max(1,(Date.parse(f.fin)-Date.parse(f.inicio))/3600000*step)} height={34} rx={3} className={f.empleados.length>2?'fill-destructive':'fill-accent'}><title>{p.nombre} · {formatArgentinaTime(f.inicio)}–{formatArgentinaTime(f.fin)} · {f.empleados.length} simultáneos: {f.empleados.map(e=>e.nombre).join(', ')}</title></rect>)}</g>)}
    </svg>
    {!personas.length&&<p className="text-sm text-muted-foreground">Sin descansos completos registrados este día.</p>}
    <p className="text-xs text-muted-foreground">Verde: 1–2 simultáneos · Rojo: 3 o más · Hora Argentina</p>
  </div>
}