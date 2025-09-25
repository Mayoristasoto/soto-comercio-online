-- FIX REMAINING SECURITY DEFINER VIEW ISSUES
-- Replace problematic views with safer versions

-- 1. Drop the problematic views
DROP VIEW IF EXISTS public.empleados_admin_sensitive;
DROP VIEW IF EXISTS public.empleados_safe_view;

-- 2. Create safer views that don't cause SECURITY DEFINER issues
-- Safe view for general employee data (no sensitive data)
CREATE VIEW public.empleados_basic AS
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

-- For admin access to sensitive data, use direct table access with proper RLS
-- No view needed - RLS policies will handle security

-- 3. Remove other potential SECURITY DEFINER functions that aren't needed
DROP FUNCTION IF EXISTS public.detect_insecure_views();
DROP FUNCTION IF EXISTS public.get_public_gondolas();
DROP FUNCTION IF EXISTS public.get_gondolas_public_view();

-- 4. Check what views still exist
SELECT schemaname, viewname 
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;