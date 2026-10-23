import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { DiaDescanso } from '@/lib/descansosReport'
import { formatArgentinaTime, getArgentinaStartOfDay } from '@/lib/dateUtils'
import { PDF_STYLES } from './pdfStyles'

export function crearDescansosDiariosPDF(dias: DiaDescanso[]) {
  const doc = new jsPDF({orientation:'landscape'})
  dias.forEach((dia,index)=>{
    if(index) doc.addPage()
    doc.setTextColor(PDF_STYLES.colors.primary);doc.setFontSize(16)
    doc.text(`Descansos · ${dia.fecha.split('-').reverse().join('/')} · ${dia.sucursal}`,14,16)
    doc.setFontSize(9);doc.setTextColor(PDF_STYLES.colors.text)
    doc.text(`Hora Argentina · Pico ${dia.maximo} simultáneos · ${dia.incompletos} incompletos · Sólo descansos fichados`,14,24)
    const personas=[...new Map(dia.franjas.flatMap(f=>f.empleados.map(p=>[p.id,p] as const))).values()].sort((a,b)=>a.nombre.localeCompare(b.nombre))
    const inicio=Date.parse(getArgentinaStartOfDay(new Date(`${dia.fecha}T00:00:00`)))
    // One time axis for all employees, expanded to whole hours around the actual breaks.
    const min=dia.franjas.length?Math.max(0,Math.floor(Math.min(24,...dia.franjas.map(f=>(Date.parse(f.inicio)-inicio)/3600000)))):0
    const max=Math.min(24,Math.max(min+1,Math.ceil(Math.max(0,...dia.franjas.map(f=>(Date.parse(f.fin)-inicio)/3600000)))))
    const left=100,width=180,step=width/(max-min)
    let y=38
    const axis=()=>{doc.setFontSize(8);for(let h=min;h<=max;h++)doc.text(`${String(h).padStart(2,'0')}:00`,left+(h-min)*step-4,y-4)}
    axis()
    for(const persona of personas){
      if(y>168){doc.addPage();y=30;axis()}
      doc.setDrawColor(PDF_STYLES.colors.border)
      for(let h=min;h<=max;h++)doc.line(left+(h-min)*step,y,left+(h-min)*step,y+12)
      doc.setFontSize(8);doc.setTextColor(PDF_STYLES.colors.text)
      doc.text(doc.splitTextToSize(persona.nombre,82).slice(0,2),14,y+4)
      for(const f of dia.franjas.filter(f=>f.empleados.some(p=>p.id===persona.id))){
        const x=left+((Date.parse(f.inicio)-inicio)/3600000-min)*step
        const w=(Date.parse(f.fin)-Date.parse(f.inicio))/3600000*step
        doc.setFillColor(f.empleados.length>2?PDF_STYLES.colors.accent:PDF_STYLES.colors.success)
        doc.rect(x,y+1,Math.max(.2,w),9,'F')
      }
      doc.line(14,y+12,280,y+12);y+=13
    }
    doc.setFontSize(8);doc.setTextColor(PDF_STYLES.colors.text)
    doc.text('Verde: 1–2 en descanso · Naranja: 3 o más simultáneos · Barras segmentadas cuando cambia la coincidencia',14,y+6)
    const superpuestas=dia.franjas.filter(f=>f.empleados.length>2)
    autoTable(doc,{startY:y+12,head:[['Más de dos · desde','Hasta','Personas','Empleados']],body:superpuestas.length?superpuestas.map(f=>[formatArgentinaTime(f.inicio),formatArgentinaTime(f.fin),f.empleados.length,f.empleados.map(p=>p.nombre).join(' · ')]):[['Sin coincidencias de tres o más','','','']],styles:{fontSize:8,cellPadding:2},headStyles:{fillColor:PDF_STYLES.colors.primary},margin:{bottom:18}})
    const end=(doc as jsPDF & {lastAutoTable?:{finalY:number}}).lastAutoTable?.finalY??y+12
    autoTable(doc,{startY:end+7,head:[['Todas las franjas · desde','Hasta','Simultáneos','Empleados']],body:dia.franjas.map(f=>[formatArgentinaTime(f.inicio),formatArgentinaTime(f.fin),f.empleados.length,f.empleados.map(p=>p.nombre).join(' · ')]),styles:{fontSize:7,cellPadding:1.7},headStyles:{fillColor:PDF_STYLES.colors.secondary},margin:{bottom:18}})
  })
  for(let n=1;n<=doc.getNumberOfPages();n++){doc.setPage(n);doc.setFontSize(7);doc.setTextColor(PDF_STYLES.colors.textLight);doc.text(`${n} / ${doc.getNumberOfPages()} · Sucursal asignada · No se estiman incompletos · Coincidir no implica sanción`,14,202)}
  return doc
}

export function exportDescansosDiariosPDF(dias:DiaDescanso[],nombre:string){
  if(!dias.length)return
  const blob=crearDescansosDiariosPDF(dias).output('blob')
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a');a.href=url;a.download=`descansos_diarios_${nombre}.pdf`
  document.body.appendChild(a);a.click();a.remove()
  setTimeout(()=>URL.revokeObjectURL(url),30000)
}