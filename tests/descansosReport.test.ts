import { test, expect } from 'bun:test'
import { calcularDescansos, analizarSuperposiciones, FilaDescanso } from '../src/lib/descansosReport'
const emp = [{ id: 'e', nombre: 'Ana', apellido: 'Pérez', sucursal_id: 'marti' }, {id:'otro', nombre:'Otro', apellido:'Empleado', sucursal_id:'juanb'}]
const suc = [{id:'marti', nombre:'José Martí'}, {id:'juanb', nombre:'Juan B. Justo'}]
const asig = [{ empleado_id:'e',fecha_inicio:'2026-01-01',fecha_fin:null,turno:{dias_semana:[1,2,3,4,5,6,0],duracion_pausa_minutos:40}}]
const m = (id:string,tipo:string,time:string, empleado_id='e') => ({id,tipo,timestamp_real:time,empleado_id})
const calc = (marcas: ReturnType<typeof m>[]) => calcularDescansos(marcas,emp,suc,asig,[],'2026-10-01','2026-10-23')
test('40 minutos y 59 segundos no exceden los 40 minutos completos permitidos', () => {
 const [r] = calc([m('1','pausa_inicio','2026-10-01T15:00:00Z'),m('2','pausa_fin','2026-10-01T15:40:59Z')]); expect(r.minutos).toBe(40); expect(r.exceso).toBe(0)
})
test('41 minutos implican un minuto de exceso', () => {
 const [r] = calc([m('1','pausa_inicio','2026-10-01T15:00:00Z'),m('2','pausa_fin','2026-10-01T15:41:00Z')]); expect(r.exceso).toBe(1)
})
test('fecha Argentina y cruce de medianoche', () => {
 const [r] = calc([m('1','pausa_inicio','2026-10-02T02:50:00Z'),m('2','pausa_fin','2026-10-02T03:20:00Z')]); expect(r.fecha).toBe('2026-10-01'); expect(r.minutos).toBe(30)
})
test('salida no se usa como regreso ni se enlaza una pausa al día siguiente', () => {
 const r = calc([m('1','pausa_inicio','2026-10-01T15:00:00Z'),m('2','salida','2026-10-01T18:00:00Z'),m('3','pausa_fin','2026-10-02T15:40:00Z')]); expect(r.map(f=>f.estado).sort()).toEqual(['Sin inicio','Sin regreso']); expect(r.every(f=>f.minutos===null)).toBe(true)
})
test('el filtro por sucursal conserva solo José Martí', () => {
 const r=calc([m('1','pausa_inicio','2026-10-01T15:00:00Z'),m('2','pausa_fin','2026-10-01T15:41:00Z'),m('3','pausa_inicio','2026-10-01T15:00:00Z','otro')]); expect(r.filter(f=>f.sucursal_id==='marti').map(f=>f.empleado_id)).toEqual(['e'])
})

const pausa=(id:string,inicio:string,fin:string|null,sucursal_id='marti'):FilaDescanso=>({id,empleado_id:id,empleado:id,sucursal:sucursal_id,sucursal_id,puesto:'',fecha:'2026-10-01',inicio,fin,minutos:null,permitido:40,exceso:null,estado:fin?'Completo':'Sin regreso',justificado:false})
test('identifica los nombres y la franja exacta de dos descansos superpuestos',()=>{
 const [d]=analizarSuperposiciones([pausa('Ana','2026-10-01T15:00:00Z','2026-10-01T15:40:00Z'),pausa('Luis','2026-10-01T15:20:00Z','2026-10-01T16:00:00Z')],'2026-10-01','2026-10-01')
 expect(d.maximo).toBe(2);expect(d.minutosSuperpuestos).toBe(20);expect(d.empleadosSuperpuestos).toEqual(['Ana','Luis']);expect(d.franjas[1].inicio).toBe('2026-10-01T15:20:00.000Z');expect(d.franjas[1].fin).toBe('2026-10-01T15:40:00.000Z');expect(d.horas[12]).toBe(2)
})
test('un regreso exactamente al iniciar otro descanso no es superposición',()=>{
 const [d]=analizarSuperposiciones([pausa('A','2026-10-01T15:00:00Z','2026-10-01T15:40:00Z'),pausa('B','2026-10-01T15:40:00Z','2026-10-01T16:00:00Z')],'2026-10-01','2026-10-01');expect(d.maximo).toBe(1);expect(d.minutosSuperpuestos).toBe(0)
})
test('no mezcla sucursales ni presume duración para descansos incompletos',()=>{
 const d=analizarSuperposiciones([pausa('A','2026-10-01T15:00:00Z','2026-10-01T15:40:00Z'),pausa('B','2026-10-01T15:00:00Z','2026-10-01T15:40:00Z','otra'),pausa('C','2026-10-01T15:00:00Z',null)],'2026-10-01','2026-10-01');expect(d.map(x=>x.maximo)).toEqual([1,1]);expect(d[0].incompletos).toBe(1)
})
test('divide superposiciones en medianoche Argentina e incluye días sin marcas',()=>{
 const d=analizarSuperposiciones([pausa('A','2026-10-02T02:50:00Z','2026-10-02T03:20:00Z'),pausa('B','2026-10-02T02:55:00Z','2026-10-02T03:10:00Z')],'2026-10-01','2026-10-03');expect(d.map(x=>x.minutosSuperpuestos)).toEqual([5,10,0]);expect(d[0].horas[23]).toBe(2);expect(d[1].horas[0]).toBe(2)
})
test('filtrar un empleado conserva los compañeros que coinciden con él',()=>{
 const [d]=analizarSuperposiciones([pausa('A','2026-10-01T15:00:00Z','2026-10-01T15:40:00Z'),pausa('B','2026-10-01T15:20:00Z','2026-10-01T16:00:00Z')],'2026-10-01','2026-10-01','A');expect(d.empleadosSuperpuestos).toEqual(['A','B']);expect(d.completos).toBe(1);expect(d.minutosSuperpuestos).toBe(20)
})