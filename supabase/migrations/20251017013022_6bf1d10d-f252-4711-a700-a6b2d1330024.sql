-- Crear desafíos de prueba activos
INSERT INTO desafios (titulo, descripcion, tipo_periodo, fecha_inicio, fecha_fin, objetivos, puntos_por_objetivo, estado, es_grupal) VALUES
('Ventas del Mes', 'Alcanzar meta de ventas del mes de enero', 'mensual', '2025-01-01', '2025-01-31', 
 '[{"nombre": "Vender 100 unidades", "descripcion": "Meta principal de ventas"}]'::jsonb,
 '{"obj_1": 100}'::jsonb, 'activo', false),
 
('Puntualidad Perfecta', 'Llegar a tiempo todos los días del mes', 'mensual', '2025-01-01', '2025-01-31',
 '[{"nombre": "100% puntualidad", "descripcion": "No llegar tarde ningún día"}]'::jsonb,
 '{"obj_1": 50}'::jsonb, 'activo', false),
 
('Capacitación Semestral', 'Completar todas las capacitaciones del semestre', 'semestral', '2025-01-01', '2025-06-30',
 '[{"nombre": "Completar 5 cursos", "descripcion": "Finalizar los cursos asignados"}]'::jsonb,
 '{"obj_1": 150}'::jsonb, 'activo', false),
 
('Satisfacción del Cliente', 'Mantener calificación de 4.5+ en atención al cliente', 'semanal', '2025-01-13', '2025-01-19',
 '[{"nombre": "Calificación promedio 4.5+", "descripcion": "Excelencia en servicio"}]'::jsonb,
 '{"obj_1": 75}'::jsonb, 'activo', false);

-- Crear participaciones con diferentes niveles de progreso
-- Para el primer desafío (Ventas del Mes)
INSERT INTO participaciones (desafio_id, empleado_id, progreso, created_at) 
SELECT 
  (SELECT id FROM desafios WHERE titulo = 'Ventas del Mes' LIMIT 1),
  id,
  CASE 
    WHEN row_number() OVER () = 1 THEN 95
    WHEN row_number() OVER () = 2 THEN 88
    WHEN row_number() OVER () = 3 THEN 82
    WHEN row_number() OVER () = 4 THEN 75
    WHEN row_number() OVER () = 5 THEN 68
    WHEN row_number() OVER () = 6 THEN 55
    WHEN row_number() OVER () = 7 THEN 45
    ELSE 30
  END,
  now()
FROM empleados 
WHERE activo = true 
LIMIT 8;

-- Para el segundo desafío (Puntualidad Perfecta)
INSERT INTO participaciones (desafio_id, empleado_id, progreso, created_at) 
SELECT 
  (SELECT id FROM desafios WHERE titulo = 'Puntualidad Perfecta' LIMIT 1),
  id,
  CASE 
    WHEN row_number() OVER () = 1 THEN 100
    WHEN row_number() OVER () = 2 THEN 96
    WHEN row_number() OVER () = 3 THEN 92
    WHEN row_number() OVER () = 4 THEN 85
    WHEN row_number() OVER () = 5 THEN 78
    WHEN row_number() OVER () = 6 THEN 65
    ELSE 50
  END,
  now()
FROM empleados 
WHERE activo = true 
LIMIT 7;

-- Para el tercer desafío (Capacitación Semestral)
INSERT INTO participaciones (desafio_id, empleado_id, progreso, created_at) 
SELECT 
  (SELECT id FROM desafios WHERE titulo = 'Capacitación Semestral' LIMIT 1),
  id,
  CASE 
    WHEN row_number() OVER () = 1 THEN 80
    WHEN row_number() OVER () = 2 THEN 75
    WHEN row_number() OVER () = 3 THEN 60
    WHEN row_number() OVER () = 4 THEN 55
    WHEN row_number() OVER () = 5 THEN 40
    ELSE 25
  END,
  now()
FROM empleados 
WHERE activo = true 
LIMIT 6;

-- Para el cuarto desafío (Satisfacción del Cliente)
INSERT INTO participaciones (desafio_id, empleado_id, progreso, created_at) 
SELECT 
  (SELECT id FROM desafios WHERE titulo = 'Satisfacción del Cliente' LIMIT 1),
  id,
  CASE 
    WHEN row_number() OVER () = 1 THEN 100
    WHEN row_number() OVER () = 2 THEN 98
    WHEN row_number() OVER () = 3 THEN 93
    WHEN row_number() OVER () = 4 THEN 87
    WHEN row_number() OVER () = 5 THEN 81
    WHEN row_number() OVER () = 6 THEN 72
    ELSE 60
  END,
  now()
FROM empleados 
WHERE activo = true 
LIMIT 9;