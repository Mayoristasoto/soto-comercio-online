

## Plan: Detalle diario al hacer click en un empleado del Balance Mensual

### Qué falta
El Balance Mensual muestra totales pero no permite ver el desglose día por día. Necesitás hacer click en "Agustina Galaz" y ver cada día: entrada, salida, hs trabajadas, diferencia vs 6hs, y un acumulado semanal para verificar si llega a las 36hs.

### Solución
Agregar un **modal/drawer de detalle** que se abre al hacer click en cualquier empleado de la tabla del Balance Mensual.

```text
┌─ Detalle: Galaz, Agustina Lucía — Marzo 2026 ─────────────┐
│ Jornada: 6hs | Objetivo semanal: 36hs                      │
│                                                              │
│ Fecha       │ Entrada │ Salida │ Trabajó  │ Dif vs 6hs      │
│ Lun 03/03   │ 09:02   │ 15:10  │ 6h 08m   │ +8m   🟢       │
│ Mar 04/03   │ 09:15   │ 14:50  │ 5h 35m   │ -25m  🔴       │
│ ...         │         │        │          │                  │
│─────────────┼─────────┼────────┼──────────┼─────────────────│
│ Semana 1    │         │        │ 34h 20m  │ -1h 40m 🔴      │
│ Semana 2    │         │        │ 37h 10m  │ +1h 10m 🟢      │
│ ...         │         │        │          │                  │
│─────────────┼─────────┼────────┼──────────┼─────────────────│
│ TOTAL MES   │         │        │ 142h 30m │ -5h 30m 🔴      │
└──────────────────────────────────────────────────────────────┘
```

### Implementación

**`src/components/fichero/BalanceMensualHoras.tsx`** (modificar):
- Agregar estado `empleadoSeleccionado` 
- Al hacer click en una fila de la tabla, abrir el modal con el empleado seleccionado
- Pasar el mes seleccionado al modal

**`src/components/fichero/DetalleDiarioEmpleado.tsx`** (nuevo):
- Recibe: `empleadoId`, `mes` (yyyy-MM), `nombre`, `horasJornada`, `horasSemanales`
- Consulta fichajes del empleado en ese mes
- Muestra tabla día por día con entrada, salida, minutos trabajados, diferencia
- Agrega filas de subtotal por semana (Lun→Dom)
- Fila final con total del mes
- Colores: verde si positivo, rojo si negativo
- Botón para exportar el detalle como Excel

### Archivos

| Archivo | Cambio |
|---------|--------|
| `src/components/fichero/DetalleDiarioEmpleado.tsx` | Nuevo — modal con tabla día por día + subtotales semanales |
| `src/components/fichero/BalanceMensualHoras.tsx` | Agregar click handler en filas + estado para abrir modal |

