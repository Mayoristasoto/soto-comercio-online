# Tarjeta de incidencias del día en el dashboard

Nueva tarjeta simple en el dashboard principal, justo debajo de "Estado del personal hoy", con las incidencias de hoy y el contexto semanal/mensual de cada empleado.

## Qué se va a ver

**Encabezado:** total de incidencias de hoy, separadas por tipo (llegada tarde / pausa excedida), con la fecha en zona horaria Argentina.

**Una fila por incidencia de hoy** con:
- Nombre del empleado, sucursal y tipo de incidencia (badge: ámbar = llegada tarde, naranja = pausa excedida) más los minutos de desvío.
- Contadores acumulados: `Semana: N` y `Mes: N` de ese empleado (solo incidencias no anuladas).
- Índice mensual en porcentaje, con el mismo criterio visual del índice de ausentismo (verde bajo / amarillo medio / rojo alto): incidencias del mes sobre días trabajados del mes.
- Chip de patrón cuando corresponde, por ejemplo "Siempre los lunes (4 de 5)" o "Recurrente: 3 semanas seguidas", detectado sobre las incidencias de los últimos 60 días del empleado.

**Estado vacío:** "Sin incidencias hoy" en verde cuando no hay ninguna.

**Acción:** link "Ver todas" que lleva al listado de incidencias existente, para no duplicar la gestión (anulación, exportes) en el dashboard.

## Detalles técnicos

- Componente nuevo `src/components/dashboard/IncidenciasHoy.tsx` + hook `src/hooks/useIncidenciasHoy.ts`, insertado en `src/pages/Dashboard.tsx` inmediatamente después de `<EstadoPersonalHoy />`.
- Datos desde `empleado_cruces_rojas` (`anulada = false`), filtrando por `fecha_infraccion` en un solo query del mes en curso más los 60 días previos; el agrupado de hoy/semana/mes y la detección de patrón por día de semana se calculan en el cliente con `useMemo`, sin nuevas RPC.
- Nombres y sucursal vía join a `empleados` (misma relación que usa `ListadoIncidencias.tsx`).
- Días trabajados del mes (denominador del porcentaje) desde `fichajes` de tipo entrada del empleado en el mes, contando fechas distintas.
- Fechas y semana ISO con los helpers de `src/lib/dateUtils.ts` (zona Argentina), sin `new Date()` crudo para el día de hoy.
- Colores solo con tokens semánticos del design system, igual que las demás tarjetas del dashboard.
- Auto-refresh cada 60 s con botón de recarga manual, siguiendo el patrón de `useEstadoPersonalHoy`.
