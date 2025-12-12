-- Crear usuarios demo para pruebas de kiosco
-- Usuario 1: Empleado Demo
INSERT INTO public.empleados (id, nombre, apellido, email, rol, activo, legajo, dni)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Juan',
  'Demo Empleado',
  'demo.empleado@test.com',
  'empleado',
  true,
  'DEMO001',
  '00000001'
)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  apellido = EXCLUDED.apellido,
  activo = true;

-- Usuario 2: Gerente Sucursal Demo
INSERT INTO public.empleados (id, nombre, apellido, email, rol, activo, legajo, dni)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'María',
  'Demo Gerente',
  'demo.gerente@test.com',
  'gerente_sucursal',
  true,
  'DEMO002',
  '00000002'
)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  apellido = EXCLUDED.apellido,
  activo = true;