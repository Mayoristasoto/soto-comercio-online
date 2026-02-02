-- Eliminar constraints problemáticos que causan conflictos al reasignar horarios
ALTER TABLE empleado_turnos 
DROP CONSTRAINT IF EXISTS empleado_turnos_empleado_id_fecha_inicio_key;

ALTER TABLE empleado_turnos 
DROP CONSTRAINT IF EXISTS empleado_turnos_empleado_turno_unique;

-- Eliminar índices existentes si los hay
DROP INDEX IF EXISTS empleado_turnos_empleado_fecha_activo_idx;
DROP INDEX IF EXISTS empleado_turnos_empleado_turno_activo_idx;

-- Crear índices únicos parciales (solo para registros activos)
-- Esto permite múltiples registros inactivos pero solo uno activo por combinación
CREATE UNIQUE INDEX empleado_turnos_empleado_fecha_activo_idx 
ON empleado_turnos (empleado_id, fecha_inicio) 
WHERE activo = true;

CREATE UNIQUE INDEX empleado_turnos_empleado_turno_activo_idx 
ON empleado_turnos (empleado_id, turno_id) 
WHERE activo = true;