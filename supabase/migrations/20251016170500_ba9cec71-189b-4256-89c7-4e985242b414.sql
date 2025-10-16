-- Fix function search_path issues by ensuring all functions have proper search_path set
-- This prevents search_path hijacking attacks

-- Update functions that are missing proper search_path
CREATE OR REPLACE FUNCTION public.get_facial_config(config_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value 
  FROM public.facial_recognition_config 
  WHERE key = config_key 
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.calcular_dias_habiles(fecha_inicio date, fecha_fin date)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  dias INTEGER := 0;
  fecha_actual DATE := fecha_inicio;
BEGIN
  WHILE fecha_actual <= fecha_fin LOOP
    IF EXTRACT(DOW FROM fecha_actual) NOT IN (0, 6) THEN
      dias := dias + 1;
    END IF;
    fecha_actual := fecha_actual + 1;
  END LOOP;
  RETURN dias;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_admin_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.empleados 
    WHERE user_id = auth.uid() 
    AND rol = 'admin_rrhh'
    AND activo = true
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_gondola_display()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
$$;

CREATE OR REPLACE FUNCTION public.aplicar_redondeo_fichaje(timestamp_real timestamp with time zone, redondeo_minutos integer)
RETURNS timestamp with time zone
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  minutos_actual integer;
  minutos_redondeados integer;
  timestamp_base timestamp with time zone;
BEGIN
  IF redondeo_minutos IS NULL OR redondeo_minutos <= 0 THEN
    RETURN timestamp_real;
  END IF;
  
  timestamp_base := date_trunc('hour', timestamp_real);
  minutos_actual := EXTRACT(MINUTE FROM timestamp_real);
  minutos_redondeados := (minutos_actual / redondeo_minutos) * redondeo_minutos;
  
  IF (minutos_actual % redondeo_minutos) >= (redondeo_minutos / 2) THEN
    minutos_redondeados := minutos_redondeados + redondeo_minutos;
  END IF;
  
  RETURN timestamp_base + (minutos_redondeados || ' minutes')::interval;
END;
$$;