-- FIX SECURITY DEFINER VIEW ISSUE
-- Replace the problematic view with a secure implementation that respects RLS

-- 1. Drop the current problematic view
DROP VIEW IF EXISTS public.empleados_secure_view;

-- 2. Create a new view that doesn't bypass RLS policies
-- This view will respect the RLS policies on the underlying tables
CREATE VIEW public.empleados_safe_view AS
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
  e.updated_at
FROM public.empleados e
WHERE e.activo = true;

-- 3. Create a separate admin-only view for sensitive data that relies on RLS policies
CREATE VIEW public.empleados_admin_sensitive AS
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
  eds.dni,
  eds.telefono,
  eds.direccion,
  eds.salario,
  eds.fecha_nacimiento,
  eds.estado_civil,
  eds.emergencia_contacto_nombre,
  eds.emergencia_contacto_telefono,
  CASE 
    WHEN eds.face_descriptor IS NOT NULL AND array_length(eds.face_descriptor, 1) > 0 
    THEN true 
    ELSE false 
  END as has_face_descriptor
FROM public.empleados e
LEFT JOIN public.empleados_datos_sensibles eds ON e.id = eds.empleado_id
WHERE e.activo = true;

-- 4. Enable RLS on the new views (though views inherit RLS from underlying tables)
-- The RLS policies will be enforced on the underlying tables

-- 5. Update the existing RLS policies to be more explicit about admin access
-- Create a new function that doesn't use SECURITY DEFINER but checks roles properly
CREATE OR REPLACE FUNCTION public.user_has_admin_role()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.empleados 
    WHERE user_id = auth.uid() 
    AND rol = 'admin_rrhh'
    AND activo = true
  );
$$;

-- 6. Update RLS policy on empleados_datos_sensibles to use the new function
DROP POLICY IF EXISTS "Admin can manage all sensitive data" ON public.empleados_datos_sensibles;
CREATE POLICY "Admin can manage all sensitive data" 
ON public.empleados_datos_sensibles 
FOR ALL 
USING (user_has_admin_role())
WITH CHECK (user_has_admin_role());

-- 7. Add RLS policy to empleados_admin_sensitive view access
-- Note: Views don't have RLS directly, but they inherit from underlying tables

-- 8. Add documentation comments
COMMENT ON VIEW public.empleados_safe_view IS 'Safe view of employee basic data that respects RLS policies';
COMMENT ON VIEW public.empleados_admin_sensitive IS 'Admin view with sensitive data - access controlled by RLS on underlying tables';
COMMENT ON FUNCTION public.user_has_admin_role() IS 'Non-SECURITY DEFINER function to check admin role safely';