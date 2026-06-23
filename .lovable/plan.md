
## Objetivo

Agregar al Dashboard Principal una nueva sección **"Estado del personal hoy"** que muestre, agrupado por sucursal, cuántos empleados están:

- **Trabajando** (con fichaje de entrada hoy sin salida)
- **En descanso / pausa** (pausa activa actual)
- **Ausentes / no fichados** (con turno hoy pero sin fichar)
- **De vacaciones** (solicitud aprobada que incluye hoy)
- **Con licencia / ausencia médica** (ausencia médica aprobada vigente hoy)
- **Franco / sin turno** (no tiene turno hoy)

## UI

Nueva tarjeta en `src/pages/Dashboard.tsx` arriba del Calendario de Eventos:

- Encabezado con título, fecha de hoy y total general por estado (chips de colores).
- Grid de **cards por sucursal**, cada una con:
  - Nombre de sucursal + total de empleados activos
  - Contadores con colores semánticos: verde (Trabajando), ámbar (Descanso), rojo (Ausente), azul (Vacaciones), violeta (Licencia), gris (Franco)
  - Botón "Ver detalle" → abre un Dialog con la lista de empleados de esa sucursal y su estado, con avatar/nombre/puesto/hora de entrada si aplica.
- Filtro arriba: selector de sucursal (Todas / específica) y switch "Solo con incidencias".
- Botón refrescar manual + auto-refresh cada 60s.

Componentes nuevos:
- `src/components/dashboard/EstadoPersonalHoy.tsx` — contenedor + grid de sucursales
- `src/components/dashboard/EstadoSucursalCard.tsx` — card de una sucursal
- `src/components/dashboard/EstadoPersonalDetalleDialog.tsx` — modal con lista de empleados

## Lógica de datos

Hook `src/hooks/useEstadoPersonalHoy.ts` que para `hoy` (TZ Argentina) calcula por empleado activo su estado, en este orden de prioridad:

1. **Vacaciones**: existe `solicitudes_vacaciones` con `estado='aprobada'` y `hoy BETWEEN fecha_inicio AND fecha_fin`.
2. **Licencia**: existe `ausencias_medicas` aprobada vigente hoy.
3. **Trabajando / Descanso / Ausente**: a partir de `fichajes` y `empleado_turnos` del día:
   - Tiene fichaje de entrada hoy sin salida → si hay pausa activa (lógica existente `kiosk_get_pausa_activa` / campos de pausa en `fichajes`) → **Descanso**, si no → **Trabajando**.
   - Tiene turno hoy y no fichó → **Ausente**.
   - No tiene turno hoy → **Franco**.

Para evitar N+1: una sola RPC `dashboard_estado_personal_hoy()` (SECURITY DEFINER) que devuelva una fila por empleado activo con `empleado_id, nombre, apellido, sucursal_id, sucursal_nombre, puesto, estado, hora_entrada, hora_pausa_inicio`. El frontend agrupa por sucursal y cuenta.

Acceso: solo roles con permiso de ver el dashboard global (admin / admin_rrhh / gerente_sucursal). Para gerente_sucursal, la RPC filtra a sus sucursales asignadas (`asignacion_empleado_sucursal`).

## Detalles técnicos

**Archivos nuevos:**
- `src/components/dashboard/EstadoPersonalHoy.tsx`
- `src/components/dashboard/EstadoSucursalCard.tsx`
- `src/components/dashboard/EstadoPersonalDetalleDialog.tsx`
- `src/hooks/useEstadoPersonalHoy.ts`

**Archivos a modificar:**
- `src/pages/Dashboard.tsx` — montar `<EstadoPersonalHoy />` antes del calendario.

**Migración:**
- Crear RPC `public.dashboard_estado_personal_hoy()` SECURITY DEFINER que aplique el cálculo anterior y aplique filtro por sucursales del usuario si es gerente. GRANT EXECUTE a `authenticated`.

**Colores:** usar tokens semánticos existentes (`text-emerald-600`, `text-amber-600`, etc. ya usados en el proyecto). Sin hardcode de hex.

**TZ:** usar `src/lib/dateUtils.ts` (Argentina UTC-3) para obtener "hoy".

## Validación

1. Empleado fichado entrada sin salida → cuenta en **Trabajando** de su sucursal.
2. Mismo empleado inicia pausa → pasa a **Descanso**.
3. Empleado con `solicitudes_vacaciones` aprobada que cubre hoy → **Vacaciones** (aunque tenga turno).
4. Empleado con turno hoy y sin fichaje → **Ausente**.
5. Gerente de sucursal solo ve sus sucursales; admin/RRHH ven todas.
6. Totales por sucursal coinciden con totales generales.
