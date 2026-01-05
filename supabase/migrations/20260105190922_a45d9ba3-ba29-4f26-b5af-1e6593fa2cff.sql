-- 1. Eliminar duplicados manteniendo solo el más reciente
DELETE FROM empleado_turnos a
USING empleado_turnos b
WHERE a.empleado_id = b.empleado_id 
  AND a.turno_id = b.turno_id
  AND a.id < b.id;

-- 2. Crear constraint única
ALTER TABLE empleado_turnos 
ADD CONSTRAINT empleado_turnos_empleado_turno_unique 
UNIQUE (empleado_id, turno_id);

-- 3. Insertar los turnos para los 6 empleados
INSERT INTO empleado_turnos (empleado_id, turno_id, fecha_inicio, activo)
VALUES
  ('105996f4-9ad6-47b3-9da6-a8a544fb4228', '504177ae-e519-4c97-b686-329c0fb96c8d', now(), true),
  ('88f9934f-1b77-40b4-a79c-d054520b3354', '504177ae-e519-4c97-b686-329c0fb96c8d', now(), true),
  ('54278134-59d7-4ac8-abd1-6bc906e871b3', '504177ae-e519-4c97-b686-329c0fb96c8d', now(), true),
  ('15b5f20a-8c16-4a16-8782-04100f92f9f3', '02bd696b-ff25-43c2-9cdc-bb8fe6d429cd', now(), true),
  ('7d756f49-6d00-420b-88cb-21bc4ecd1a39', '02bd696b-ff25-43c2-9cdc-bb8fe6d429cd', now(), true),
  ('39571dd7-94f3-4fa5-84fc-ea6baadc8eec', '6f216491-4bd3-41a2-afcd-c3988f6a055c', now(), true)
ON CONFLICT (empleado_id, turno_id) 
DO UPDATE SET activo = true, updated_at = now();