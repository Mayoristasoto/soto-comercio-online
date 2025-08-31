-- Crear registro de empleado para Juan Cruz Soto con rol admin
INSERT INTO public.empleados (
  user_id,
  nombre,
  apellido,
  email,
  rol,
  activo,
  fecha_ingreso
) VALUES (
  '4d257d7f-ed98-4cf5-95f2-3ed530005537',
  'Juan Cruz',
  'Soto',
  'juancruzsoto@gmail.com',
  'admin_rrhh',
  true,
  CURRENT_DATE
)
ON CONFLICT (user_id) DO UPDATE SET
  rol = 'admin_rrhh',
  activo = true;