## Plan

Cambiar el cálculo global de horas extras para que todos los empleados usen la misma regla:

- Menos de 25 minutos extra: no se computa.
- Desde 25 hasta 47 minutos extra: se computa como 0,5 horas.
- Desde 48 minutos extra: se computa como 1 hora.
- La misma lógica se repite por cada hora: por ejemplo 1h25m cuenta 1,5h y 1h48m cuenta 2h.

## Cambios propuestos

1. Ajustar la configuración por defecto del reporte de horas extras:
   - `toleranciaMin = 25`
   - `redondeoMin = 30`
   - `redondeoUmbralMin = 25`

2. Reemplazar la lógica actual de redondeo para que no dependa de un único bloque de 60 minutos.
   - Se calcularán los minutos extra reales.
   - Se tomarán las horas completas.
   - El resto de minutos se redondeará así:
     - `0 a 24` minutos: baja a 0.
     - `25 a 47` minutos: sube a 30.
     - `48 a 59` minutos: sube a 60.

3. Simplificar los textos de la UI en “Parámetros de cálculo” para que reflejen claramente esta regla global, evitando que parezca que hay que configurarlo empleado por empleado.

4. Mantener el filtro de empleados/sucursal solo como filtro de reporte, no como configuración individual.

## Archivos involucrados

- `src/utils/reporteHorasExtrasPDF.ts`
- `src/components/admin/payroll/ReporteHorasExtras.tsx`

## Resultado esperado

El cálculo y el PDF van a mostrar las horas extra redondeadas globalmente de la forma pedida: 25+ minutos = 0,5h y 48+ minutos = 1h, para cualquier empleado incluido en el reporte.