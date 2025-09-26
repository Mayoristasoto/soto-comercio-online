-- Fix security issue: Convert some SECURITY DEFINER functions to SECURITY INVOKER
-- Only changing utility functions that don't require elevated privileges

-- 1. Update trigger functions to SECURITY INVOKER (they don't need special permissions)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. Update utility functions that don't need special permissions
CREATE OR REPLACE FUNCTION public.aplicar_redondeo_fichaje(timestamp_real timestamp with time zone, redondeo_minutos integer)
RETURNS timestamp with time zone
LANGUAGE plpgsql
IMMUTABLE SECURITY INVOKER
SET search_path TO 'public'
AS $function$
DECLARE
  minutos_actual integer;
  minutos_redondeados integer;
  timestamp_base timestamp with time zone;
BEGIN
  -- Si no hay redondeo, devolver el timestamp original
  IF redondeo_minutos IS NULL OR redondeo_minutos <= 0 THEN
    RETURN timestamp_real;
  END IF;
  
  -- Obtener la base del timestamp (sin minutos ni segundos)
  timestamp_base := date_trunc('hour', timestamp_real);
  
  -- Obtener los minutos actuales
  minutos_actual := EXTRACT(MINUTE FROM timestamp_real);
  
  -- Aplicar redondeo
  minutos_redondeados := (minutos_actual / redondeo_minutos) * redondeo_minutos;
  
  -- Si la diferencia es mayor a la mitad del intervalo de redondeo, redondear hacia arriba
  IF (minutos_actual % redondeo_minutos) >= (redondeo_minutos / 2) THEN
    minutos_redondeados := minutos_redondeados + redondeo_minutos;
  END IF;
  
  RETURN timestamp_base + (minutos_redondeados || ' minutes')::interval;
END;
$function$;

-- 3. Update sync function to SECURITY INVOKER (it's just a data sync function)
CREATE OR REPLACE FUNCTION public.sync_gondola_display()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insertar o actualizar solo información no sensible
  INSERT INTO public.gondolas_display (
    id, type, position_x, position_y, position_width, position_height,
    status, section, display_category, updated_at
  ) VALUES (
    NEW.id, NEW.type, NEW.position_x, NEW.position_y, 
    NEW.position_width, NEW.position_height, NEW.status, NEW.section,
    CASE 
      WHEN NEW.status = 'occupied' THEN 'Espacio Ocupado'
      ELSE 'Disponible'
    END,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    type = EXCLUDED.type,
    position_x = EXCLUDED.position_x,
    position_y = EXCLUDED.position_y,
    position_width = EXCLUDED.position_width,
    position_height = EXCLUDED.position_height,
    status = EXCLUDED.status,
    section = EXCLUDED.section,
    display_category = EXCLUDED.display_category,
    updated_at = EXCLUDED.updated_at;
    
  RETURN NEW;
END;
$function$;

-- 4. Update create_empleado_sensitive_record to SECURITY INVOKER (it's just creating a related record)
CREATE OR REPLACE FUNCTION public.create_empleado_sensitive_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.empleados_datos_sensibles (empleado_id)
  VALUES (NEW.id)
  ON CONFLICT (empleado_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

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
  '{"change": "Converted utility functions from SECURITY DEFINER to SECURITY INVOKER", "functions": ["handle_updated_at", "update_updated_at_column", "aplicar_redondeo_fichaje", "sync_gondola_display", "create_empleado_sensitive_record"]}'::jsonb,
  auth.uid(),
  now()
);