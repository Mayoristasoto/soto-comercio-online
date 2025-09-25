-- Update the secure view to include all necessary columns for Nomina page
DROP VIEW IF EXISTS public.empleados_secure_view;

CREATE OR REPLACE VIEW public.empleados_secure_view AS
SELECT 
  e.id,
  e.nombre,
  e.apellido,
  e.email,
  e.rol,
  e.sucursal_id,
  e.grupo_id,
  e.activo,
  e.fecha_ingreso,
  e.avatar_url,
  e.legajo,
  e.puesto,
  e.created_at,
  e.updated_at,
  -- Include sensitive data for admins only
  CASE WHEN current_user_is_admin() THEN eds.dni ELSE NULL END as dni,
  CASE WHEN current_user_is_admin() THEN eds.telefono ELSE NULL END as telefono,
  CASE WHEN current_user_is_admin() THEN eds.direccion ELSE NULL END as direccion,
  CASE WHEN current_user_is_admin() THEN eds.salario ELSE NULL END as salario,
  CASE WHEN current_user_is_admin() THEN eds.fecha_nacimiento ELSE NULL END as fecha_nacimiento,
  CASE WHEN current_user_is_admin() THEN eds.estado_civil ELSE NULL END as estado_civil,
  CASE WHEN current_user_is_admin() THEN eds.emergencia_contacto_nombre ELSE NULL END as emergencia_contacto_nombre,
  CASE WHEN current_user_is_admin() THEN eds.emergencia_contacto_telefono ELSE NULL END as emergencia_contacto_telefono,
  -- Add face descriptor presence flag for compatibility
  CASE WHEN eds.face_descriptor IS NOT NULL AND array_length(eds.face_descriptor, 1) > 0 THEN true ELSE false END as has_face_descriptor
FROM public.empleados e
LEFT JOIN public.empleados_datos_sensibles eds ON e.id = eds.empleado_id;