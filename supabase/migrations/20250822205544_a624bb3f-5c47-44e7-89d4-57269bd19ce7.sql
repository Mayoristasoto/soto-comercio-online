-- SOLUCIÓN CRÍTICA DE SEGURIDAD: Eliminar vista desprotegida gondolas_public
-- Esta vista bypaseaba todas las protecciones RLS implementadas

-- 1. ELIMINAR la vista insegura gondolas_public inmediatamente
DROP VIEW IF EXISTS public.gondolas_public;

-- 2. Verificar que no hay permisos públicos en la tabla principal
REVOKE ALL ON public.gondolas FROM anon;
REVOKE ALL ON public.gondolas FROM public;

-- 3. Asegurar que solo la tabla gondolas_display tenga acceso público controlado
-- (Esta tabla ya está configurada correctamente con información no sensible)

-- 4. Crear función de vista segura para reemplazar la vista eliminada
CREATE OR REPLACE FUNCTION public.get_public_gondolas()
RETURNS TABLE (
  id text,
  type text,
  position_x numeric,
  position_y numeric,
  position_width numeric,
  position_height numeric,
  status text,
  section text,
  category text
) 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
SET search_path TO 'public'
AS $$
  -- Usar la tabla gondolas_display que ya está correctamente protegida
  SELECT 
    gd.id,
    gd.type,
    gd.position_x,
    gd.position_y,
    gd.position_width,
    gd.position_height,
    gd.status,
    gd.section,
    gd.display_category as category
  FROM public.gondolas_display gd
  ORDER BY gd.updated_at DESC;
$$;

-- 5. Verificar que RLS está habilitado en todas las tablas críticas
ALTER TABLE public.gondolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gondolas_display ENABLE ROW LEVEL SECURITY;

-- 6. Log de seguridad: registrar que se eliminó la vulnerabilidad
INSERT INTO public.profile_security_log (
  user_id,
  event_type, 
  event_details,
  timestamp
) VALUES (
  NULL, -- Sistema
  'suspicious_activity',
  '{"action": "security_fix", "issue": "removed_insecure_gondolas_public_view", "severity": "critical"}'::jsonb,
  now()
);

-- 7. Crear alerta para detectar futuras creaciones de vistas inseguras
CREATE OR REPLACE FUNCTION public.detect_insecure_views()
RETURNS TABLE (
  view_name name,
  security_risk text
) 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
SET search_path TO 'public'
AS $$
  SELECT 
    viewname::name,
    'View bypasses RLS - potential security risk'::text
  FROM pg_views 
  WHERE schemaname = 'public' 
  AND viewname LIKE '%gondola%'
  AND viewname != 'gondolas_display'; -- Excluir tabla protegida
$$;