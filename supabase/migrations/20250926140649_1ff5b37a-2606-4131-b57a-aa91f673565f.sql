-- Fix Security Definer View issue by converting specific table-valued functions
-- that don't require elevated privileges to SECURITY INVOKER

-- 1. get_presupuesto_resumen - can be SECURITY INVOKER as it uses standard RLS
CREATE OR REPLACE FUNCTION public.get_presupuesto_resumen()
RETURNS TABLE(mes_actual numeric, anual numeric, disponible_mes numeric, utilizado_mes numeric, porcentaje_utilizado numeric)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  WITH presupuesto_mes AS (
    SELECT 
      presupuesto_inicial,
      presupuesto_disponible,
      presupuesto_utilizado
    FROM public.presupuesto_empresa
    WHERE anio = EXTRACT(YEAR FROM CURRENT_DATE)
      AND mes = EXTRACT(MONTH FROM CURRENT_DATE)
      AND activo = true
    LIMIT 1
  ),
  presupuesto_anual AS (
    SELECT 
      COALESCE(SUM(presupuesto_inicial), 0) as total_anual,
      COALESCE(SUM(presupuesto_utilizado), 0) as utilizado_anual
    FROM public.presupuesto_empresa
    WHERE anio = EXTRACT(YEAR FROM CURRENT_DATE)
      AND activo = true
  )
  SELECT 
    COALESCE(pm.presupuesto_inicial, 0) as mes_actual,
    pa.total_anual as anual,
    COALESCE(pm.presupuesto_disponible, 0) as disponible_mes,
    COALESCE(pm.presupuesto_utilizado, 0) as utilizado_mes,
    CASE 
      WHEN COALESCE(pm.presupuesto_inicial, 0) > 0 
      THEN ROUND((COALESCE(pm.presupuesto_utilizado, 0) / pm.presupuesto_inicial) * 100, 2)
      ELSE 0
    END as porcentaje_utilizado
  FROM presupuesto_mes pm
  CROSS JOIN presupuesto_anual pa;
$function$;

-- Note: Most other functions (get_current_empleado_*, get_empleado_*, authenticate_face_kiosk, verificar_empleados_sin_salida) 
-- MUST remain SECURITY DEFINER because they:
-- 1. Access sensitive employee data
-- 2. Bypass normal RLS for administrative purposes
-- 3. Perform authentication operations
-- 4. Return data that users shouldn't directly access

-- Log this security change
INSERT INTO public.fichaje_auditoria (
  registro_id, 
  tabla_afectada, 
  accion, 
  datos_nuevos, 
  usuario_id, 
  timestamp_accion
) VALUES (
  gen_random_uuid(),
  'public.functions',
  'SECURITY_UPDATE',
  '{"change": "Converted budget function from SECURITY DEFINER to SECURITY INVOKER", "functions": ["get_presupuesto_resumen"], "note": "Other table-valued functions remain SECURITY DEFINER for security reasons"}'::jsonb,
  auth.uid(),
  now()
);