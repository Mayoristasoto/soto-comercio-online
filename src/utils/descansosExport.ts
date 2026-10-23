import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatArgentinaDate, formatArgentinaTime } from '@/lib/dateUtils'
import { FilaDescanso, resumirDescansos } from '@/lib/descansosReport'
import { PDF_STYLES, COMPANY_INFO } from './pdfStyles'

const fecha = (s: string) => s.split('-').reverse().join('/')
const hora = (s: string | null) => s ? formatArgentinaDate(s, 'dd/MM HH:mm:ss') : '—'
export function crearDescansosXLSX(rows: FilaDescanso[], desde: string, hasta: string, sucursal: string) {
  const wb = XLSX.utils.book_new()
  const detalle = XLSX.utils.aoa_to_sheet([
    ['Fecha','Sucursal','Empleado','Puesto','Inicio','Regreso','Duración (min)','Permitido (min)','Exceso (min)','Estado','Justificado'],
    ...rows.map(f => [fecha(f.fecha),f.sucursal,f.empleado,f.puesto,hora(f.inicio),hora(f.fin),f.minutos,f.permitido,f.exceso,f.estado,f.justificado ? 'Sí' : 'No'])
  ])
  detalle['!cols'] = [12,20,38,24,20,20,18,18,18,18,14].map(wch=>({wch}))
  const resumen = resumirDescansos(rows)
  const hoja = XLSX.utils.aoa_to_sheet([['Empleado','Sucursal','Completos','Incompletos','Promedio (min)','Excesos observados','Minutos de exceso','Excesos justificados'],...resumen.map(r=>[r.empleado,r.sucursal,r.completos,r.incompletos,r.promedio,r.excesos,r.minutosExceso,r.justificados])])
  const fin = rows.length+1
  resumen.forEach((r,i)=>{
    const n=i+2
    const empleado=`A${n}`
    const rangos={emp:`Detalle!$C$2:$C$${fin}`,dur:`Detalle!$G$2:$G$${fin}`,ex:`Detalle!$I$2:$I$${fin}`,estado:`Detalle!$J$2:$J$${fin}`,just:`Detalle!$K$2:$K$${fin}`}
    const formulas=[`COUNTIFS(${rangos.emp},${empleado},${rangos.estado},"Completo")`,`COUNTIF(${rangos.emp},${empleado})-C${n}`,`IF(C${n}=0,"",ROUND(SUMIF(${rangos.emp},${empleado},${rangos.dur})/C${n},0))`,`COUNTIFS(${rangos.emp},${empleado},${rangos.ex},">0")`,`SUMIF(${rangos.emp},${empleado},${rangos.ex})`,`COUNTIFS(${rangos.emp},${empleado},${rangos.ex},">0",${rangos.just},"Sí")`]
    formulas.forEach((f,j)=>{ const addr=XLSX.utils.encode_cell({r:i+1,c:j+2}); hoja[addr]={...hoja[addr],f} })
  })
  hoja['!cols']=[38,20,14,16,18,20,20,22].map(wch=>({wch}))
  XLSX.utils.book_append_sheet(wb,hoja,'Resumen')
  XLSX.utils.book_append_sheet(wb,detalle,'Detalle')
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Reporte de descansos',COMPANY_INFO.name],['Desde',desde],['Hasta',hasta],['Sucursal',sucursal],['Criterio','Minutos completos entre inicio y regreso. Fichadas rechazadas excluidas.'],['Sin turno','No se presume un descanso permitido: el exceso queda vacío.'],['Exceso observado','Comparación informativa; no equivale a sanción. Incluye justificados.'],['Sucursal','Sucursal actualmente asignada al empleado.'],['Domingos y feriados','Se incluyen descansos efectivamente fichados.'],['Incompletos','No se estima duración cuando falta inicio o regreso.']]),'Criterios')
  return wb
}
export function exportDescansosXLSX(rows: FilaDescanso[], desde: string, hasta: string, sucursal: string) {
  XLSX.writeFile(crearDescansosXLSX(rows,desde,hasta,sucursal),`descansos_${desde}_${hasta}.xlsx`)
}
export function crearDescansosPDF(rows: FilaDescanso[], desde: string, hasta: string, sucursal: string) {
  const doc = new jsPDF({orientation:'landscape'})
  doc.setTextColor(PDF_STYLES.colors.primary); doc.setFontSize(18)
  doc.text(`Descansos · ${sucursal}`,14,17)
  doc.setFontSize(10); doc.setTextColor(PDF_STYLES.colors.text)
  doc.text(`${COMPANY_INFO.name} | ${fecha(desde)} al ${fecha(hasta)} | Hora Argentina`,14,25)
  const resumen=resumirDescansos(rows)
  const completos=rows.filter(f=>f.minutos!==null).length
  const exceso=rows.filter(f=>(f.exceso??0)>0).length
  doc.text(`${completos} descansos completos · ${rows.length-completos} incompletos · ${exceso} excesos observados`,14,33)
  autoTable(doc,{startY:39,head:[['Empleado','Sucursal','Completos','Incompletos','Promedio min','Excesos','Min exceso','Justificados']],body:resumen.map(r=>[r.empleado,r.sucursal,r.completos,r.incompletos,r.promedio??'—',r.excesos,r.minutosExceso,r.justificados]),styles:{fontSize:8,cellPadding:3},headStyles:{fillColor:PDF_STYLES.colors.primary},margin:{bottom:35}})
  const y=(doc as jsPDF & {lastAutoTable?:{finalY:number}}).lastAutoTable?.finalY ?? 50
  doc.setFontSize(8)
  doc.text(doc.splitTextToSize('Criterio: minutos completos entre inicio y regreso. Se excluyen fichadas rechazadas. Se incluyen domingos y feriados con descansos fichados. Excesos observados, incluidos los justificados: no equivalen a sanciones. Sin turno aplicable no se presume duración permitida. Sucursal actualmente asignada. Datos incompletos: no se estima duración. No se modifican horarios ni incidencias.',265),14,y+8)
  doc.addPage(); doc.setFontSize(14); doc.text('Detalle de descansos',14,16)
  autoTable(doc,{startY:22,head:[['Fecha','Empleado','Sucursal','Inicio','Regreso','Min','Permitido','Exceso','Estado']],body:rows.map(f=>[fecha(f.fecha),f.empleado,f.sucursal,hora(f.inicio),hora(f.fin),f.minutos??'—',f.permitido??'Sin turno',f.exceso??'—',f.justificado?'Justificado':f.estado]),styles:{fontSize:7,cellPadding:2},headStyles:{fillColor:PDF_STYLES.colors.secondary},margin:{bottom:16},didParseCell:d=>{if(d.section==='body'&&d.column.index===7&&Number(d.cell.raw)>0)d.cell.styles.textColor=PDF_STYLES.colors.accent}})
  for(let i=1;i<=doc.getNumberOfPages();i++){doc.setPage(i);doc.setFontSize(8);doc.text(`${i} / ${doc.getNumberOfPages()} · Documento informativo`,14,201)}
  return doc
}
export function exportDescansosPDF(rows: FilaDescanso[], desde: string, hasta: string, sucursal: string) {
  crearDescansosPDF(rows,desde,hasta,sucursal).save(`descansos_${desde}_${hasta}.pdf`)
}