
# Plan: Solucionar Error de Asignación de Horarios

## Problema Identificado

Al intentar asignar horarios a empleados, el sistema muestra "Error: No se pudo asignar el horario" debido a conflictos con restricciones de unicidad en la base de datos.

### Causa Raíz

La tabla `empleado_turnos` tiene **dos constraints UNIQUE** que causan conflictos:

1. **`empleado_turnos_empleado_id_fecha_inicio_key`**: `UNIQUE (empleado_id, fecha_inicio)`
   - Impide que un empleado tenga dos registros con la misma fecha de inicio (incluso si uno está inactivo)
   
2. **`empleado_turnos_empleado_turno_unique`**: `UNIQUE (empleado_id, turno_id)`
   - Impide asignar el mismo turno al mismo empleado más de una vez

El flujo actual:
1. Desactiva el turno anterior (UPDATE activo = false)
2. Intenta insertar nuevo registro
3. **Falla** porque ya existe un registro (inactivo) con la misma combinación empleado_id + fecha_inicio

---

## Solución Propuesta

### Opción 1: Modificar la Lógica de Asignación (Recomendada)

En lugar de siempre insertar, usar **UPSERT** (Insert o Update si existe):

1. Si ya existe un registro para ese empleado con la misma fecha_inicio → actualizarlo con el nuevo turno_id
2. Si ya existe un registro para ese empleado con el mismo turno_id → actualizarlo con la nueva fecha_inicio
3. Solo insertar si no existe ningún conflicto

**Cambios en código:**

```text
Archivo: src/components/fichero/FicheroHorarios.tsx
Función: handleSubmitAsignacion (líneas 237-291)
```

**Nueva lógica:**
```typescript
for (const empleadoId of asignacionData.empleado_ids) {
  // 1. Desactivar asignaciones activas anteriores
  await supabase
    .from('empleado_turnos')
    .update({ activo: false, fecha_fin: new Date().toISOString().split('T')[0] })
    .eq('empleado_id', empleadoId)
    .eq('activo', true);

  // 2. Verificar si ya existe registro con misma fecha_inicio
  const { data: existingByDate } = await supabase
    .from('empleado_turnos')
    .select('id')
    .eq('empleado_id', empleadoId)
    .eq('fecha_inicio', asignacionData.fecha_inicio)
    .maybeSingle();

  // 3. Verificar si ya existe registro con mismo turno_id
  const { data: existingByTurno } = await supabase
    .from('empleado_turnos')
    .select('id')
    .eq('empleado_id', empleadoId)
    .eq('turno_id', asignacionData.turno_id)
    .maybeSingle();

  // 4. Decidir: UPDATE o INSERT
  if (existingByDate) {
    // Reactivar y actualizar el registro existente
    await supabase
      .from('empleado_turnos')
      .update({
        turno_id: asignacionData.turno_id,
        activo: true,
        fecha_fin: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingByDate.id);
  } else if (existingByTurno) {
    // Reactivar y actualizar fecha
    await supabase
      .from('empleado_turnos')
      .update({
        fecha_inicio: asignacionData.fecha_inicio,
        activo: true,
        fecha_fin: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingByTurno.id);
  } else {
    // Insertar nuevo registro
    await supabase
      .from('empleado_turnos')
      .insert([{
        empleado_id: empleadoId,
        turno_id: asignacionData.turno_id,
        fecha_inicio: asignacionData.fecha_inicio,
        activo: true
      }]);
  }
}
```

---

### Opción 2: Modificar Constraints de Base de Datos (Alternativa)

Cambiar los constraints UNIQUE para que solo apliquen a registros activos usando un índice parcial:

```sql
-- Eliminar constraints actuales
ALTER TABLE empleado_turnos 
DROP CONSTRAINT IF EXISTS empleado_turnos_empleado_id_fecha_inicio_key;

ALTER TABLE empleado_turnos 
DROP CONSTRAINT IF EXISTS empleado_turnos_empleado_turno_unique;

-- Crear índices únicos parciales (solo registros activos)
CREATE UNIQUE INDEX empleado_turnos_empleado_fecha_activo_unique 
ON empleado_turnos (empleado_id, fecha_inicio) 
WHERE activo = true;

CREATE UNIQUE INDEX empleado_turnos_empleado_turno_activo_unique 
ON empleado_turnos (empleado_id, turno_id) 
WHERE activo = true;
```

Esta opción permite múltiples registros inactivos pero solo uno activo por combinación.

---

## Recomendación

**Implementar ambas opciones:**
1. **Base de datos**: Cambiar a índices parciales para mayor flexibilidad
2. **Código**: Mejorar lógica para manejar casos de reactivación

---

## Resumen de Cambios

| Componente | Cambio |
|------------|--------|
| **Migración SQL** | Reemplazar constraints UNIQUE por índices parciales que solo aplican a registros activos |
| **FicheroHorarios.tsx** | Modificar `handleSubmitAsignacion` para verificar existencia antes de insertar y usar UPDATE cuando corresponda |

---

## Sección Técnica

### Archivos a modificar:
- `src/components/fichero/FicheroHorarios.tsx` - Función handleSubmitAsignacion (líneas 237-291)

### Nueva migración SQL:
```sql
-- Eliminar constraints problemáticos
ALTER TABLE empleado_turnos 
DROP CONSTRAINT IF EXISTS empleado_turnos_empleado_id_fecha_inicio_key;

ALTER TABLE empleado_turnos 
DROP CONSTRAINT IF EXISTS empleado_turnos_empleado_turno_unique;

-- Crear índices únicos parciales (solo para registros activos)
CREATE UNIQUE INDEX IF NOT EXISTS empleado_turnos_empleado_fecha_activo_idx 
ON empleado_turnos (empleado_id, fecha_inicio) 
WHERE activo = true;

CREATE UNIQUE INDEX IF NOT EXISTS empleado_turnos_empleado_turno_activo_idx 
ON empleado_turnos (empleado_id, turno_id) 
WHERE activo = true;
```

### Flujo mejorado de asignación:
```text
1. Obtener empleados seleccionados
2. Para cada empleado:
   a. Desactivar asignación activa actual (si existe)
   b. Buscar registro existente con misma fecha_inicio
   c. Buscar registro existente con mismo turno_id
   d. Si existe registro por fecha → UPDATE con nuevo turno
   e. Si existe registro por turno → UPDATE con nueva fecha
   f. Si no existe → INSERT nuevo registro
3. Mostrar mensaje de éxito
```
