## Problema

En el calendario de vacaciones aparecen empleados duplicados (ej. Laura Lorena Lan los días 11–17 de mayo). La causa real es que existen **filas duplicadas en `solicitudes_vacaciones`**: la solicitud original (`aprobada`) sigue ahí y, además, se insertó una nueva fila con estado `gozadas` para el mismo empleado y mismas fechas, en lugar de actualizar la existente.

Todos los duplicados detectados comparten el `created_at` `2026-06-04 17:58:23`, lo que apunta a una **importación masiva** hecha desde `VacacionesImport.tsx`, que inserta sin deduplicar.

## Plan

### 1) Limpieza de datos existentes (migración)
Detectar y eliminar duplicados conservando la fila más informativa (la `gozadas` si las fechas coinciden, sino la más reciente).

```sql
-- Caso A: mismo empleado + mismas fechas exactas, una 'aprobada' y otra 'gozadas'
-- → conservar la 'gozadas' (refleja el estado final), eliminar la 'aprobada'
WITH dups AS (
  SELECT a.id AS id_aprobada
  FROM solicitudes_vacaciones a
  JOIN solicitudes_vacaciones g
    ON a.empleado_id = g.empleado_id
   AND a.fecha_inicio = g.fecha_inicio
   AND a.fecha_fin   = g.fecha_fin
   AND a.id <> g.id
  WHERE a.estado = 'aprobada' AND g.estado = 'gozadas'
)
DELETE FROM solicitudes_vacaciones
WHERE id IN (SELECT id_aprobada FROM dups);
```

Mostraré antes el preview de las filas a borrar para que se apruebe la migración.

### 2) Prevenir nuevos duplicados en la importación
En `src/components/vacaciones/VacacionesImport.tsx`, antes de insertar cada solicitud:
- Buscar si ya existe una fila con el mismo `empleado_id` y solapamiento de fechas en estado `pendiente`/`aprobada`/`gozadas`.
- Si existe: **actualizar** la fila existente (estado, motivo) en lugar de insertar una nueva.
- Si no existe: insertar normalmente.
- Reportar al usuario cuántas filas se actualizaron vs. insertaron al finalizar la importación.

### 3) Defensa a nivel base de datos (opcional, recomendado)
Agregar un índice único parcial para impedir duplicados exactos a futuro:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS solicitudes_vacaciones_no_dup
ON solicitudes_vacaciones (empleado_id, fecha_inicio, fecha_fin)
WHERE estado IN ('pendiente','aprobada','gozadas');
```
Esto hace que cualquier inserción duplicada falle de raíz, incluso si en el futuro se omite la verificación en la app.

## Detalles técnicos

- Tabla afectada: `public.solicitudes_vacaciones`.
- Componente que muestra ambos pills: `src/components/vacaciones/CalendarioVacaciones.tsx` (`.in('estado', ['aprobada','gozadas','pendiente'])`). No requiere cambios — el bug está en los datos, no en la vista.
- No tocar `actualizar_vacaciones_gozadas()`: ya hace UPDATE correctamente.

¿Aplico la limpieza, el fix de la importación y el índice único?
