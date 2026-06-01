# Plan: Listas de empleados + Feriados trabajados en Novedades Liquidación

## 1. Base de datos

### Tabla `liquidacion_listas_empleados` (nueva)
- `nombre` (texto)
- `created_by` (uuid, auth.uid del admin)
- `empleado_ids` (uuid[])
- RLS: cada usuario solo ve/edita/borra las suyas (`created_by = auth.uid()`).
- GRANTs a `authenticated` y `service_role`.

### Tabla `dias_feriados` (ya existe)
- Precargar feriados nacionales **inamovibles + trasladables ya calculados** de Argentina 2024-2027 vía migración SQL (no incluir "días no laborables").
- Campos usados: `fecha`, `nombre`, `tipo='nacional'`.

## 2. UI en `/rrhh/novedades-liquidacion`

### Bloque "Listas guardadas"
- Select con mis listas + botones: **Cargar**, **Guardar como…**, **Eliminar**.
- Al cargar: setea el filtro multi-select de empleados.
- Modal "Guardar como…": pide nombre, persiste los IDs actualmente seleccionados.

### Filtro "Excluir empleados sin fichajes"
- Checkbox. Si está activo, después de traer datos se ocultan los empleados con 0 fichajes en el rango Desde-Hasta.

### Nueva sección/tab "Feriados trabajados"
- Tabla: Empleado · Legajo · Sucursal · Fecha · Feriado · Hora entrada · Hora salida · Horas trabajadas.
- Se calcula cruzando `fichajes` con `dias_feriados` dentro del rango.
- Se incluye en exportes **PDF** y **XLSX** como sección/hoja adicional.

## 3. Backend

### RPC `get_feriados_trabajados(p_desde, p_hasta, p_sucursal_id, p_empleado_ids)`
- Devuelve filas de fichajes (entrada+salida pareados) cuya fecha coincide con un feriado nacional.
- Calcula horas trabajadas (último out − primer in del día).

### Sin cambios en `get_novedades_liquidacion`
- El filtro "sin fichajes" y las listas se aplican en el frontend para no romper la RPC.

## 4. Archivos a tocar

- `supabase/migrations/*` — crear tabla listas + insertar feriados AR 2024-2027 + RPC feriados trabajados.
- `src/pages/NovedadesLiquidacion.tsx` — UI listas, checkbox exclusión, tab feriados.
- `src/components/novedades/ListasEmpleadosManager.tsx` (nuevo) — guardar/cargar/borrar listas.
- `src/components/novedades/FeriadosTrabajadosTable.tsx` (nuevo).
- `src/utils/novedadesLiquidacionPDF.ts` y `…XLSX.ts` — agregar sección/hoja "Feriados trabajados".

## 5. Fuera de alcance
- No se calcula recargo del 100% (Art. 166 LCT) — solo informa horas.
- No se sincronizan feriados vía API externa; se precargan por SQL.
- Las listas son privadas por usuario, no compartidas.
