-- Habilitar RLS y crear políticas de seguridad para las tablas de fichado

-- Habilitar RLS en todas las nuevas tablas
ALTER TABLE public.fichado_ubicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichado_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empleado_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichaje_incidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichaje_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichado_configuracion ENABLE ROW LEVEL SECURITY;

-- Políticas para fichado_ubicaciones
CREATE POLICY "Admins pueden gestionar ubicaciones"
ON public.fichado_ubicaciones
FOR ALL
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

CREATE POLICY "Empleados pueden ver ubicaciones activas"
ON public.fichado_ubicaciones
FOR SELECT
TO authenticated
USING (activa = true AND auth.uid() IS NOT NULL);

-- Políticas para fichado_turnos
CREATE POLICY "Admins pueden gestionar turnos"
ON public.fichado_turnos
FOR ALL
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

CREATE POLICY "Empleados pueden ver turnos activos"
ON public.fichado_turnos
FOR SELECT
TO authenticated
USING (activo = true AND auth.uid() IS NOT NULL);

-- Políticas para empleado_turnos
CREATE POLICY "Admins pueden gestionar asignaciones de turno"
ON public.empleado_turnos
FOR ALL
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

CREATE POLICY "Empleados pueden ver sus turnos"
ON public.empleado_turnos
FOR SELECT
TO authenticated
USING (empleado_id = get_current_empleado());

-- Políticas para fichajes (la tabla principal)
CREATE POLICY "Empleados pueden crear sus fichajes"
ON public.fichajes
FOR INSERT
TO authenticated
WITH CHECK (empleado_id = get_current_empleado());

CREATE POLICY "Empleados pueden ver sus propios fichajes"
ON public.fichajes
FOR SELECT
TO authenticated
USING (empleado_id = get_current_empleado());

CREATE POLICY "Admins pueden ver todos los fichajes"
ON public.fichajes
FOR SELECT
TO authenticated
USING (current_user_is_admin());

CREATE POLICY "Admins pueden actualizar fichajes"
ON public.fichajes
FOR UPDATE
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Políticas para fichaje_incidencias
CREATE POLICY "Empleados pueden crear sus incidencias"
ON public.fichaje_incidencias
FOR INSERT
TO authenticated
WITH CHECK (empleado_id = get_current_empleado());

CREATE POLICY "Empleados pueden ver sus incidencias"
ON public.fichaje_incidencias
FOR SELECT
TO authenticated
USING (empleado_id = get_current_empleado());

CREATE POLICY "Admins pueden gestionar incidencias"
ON public.fichaje_incidencias
FOR ALL
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Políticas para auditoría (solo administradores)
CREATE POLICY "Solo admins pueden ver auditoría"
ON public.fichaje_auditoria
FOR SELECT
TO authenticated
USING (current_user_is_admin());

-- Políticas para configuración (solo administradores)
CREATE POLICY "Solo admins pueden gestionar configuración"
ON public.fichado_configuracion
FOR ALL
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Crear función para aplicar redondeo de tiempo
CREATE OR REPLACE FUNCTION public.aplicar_redondeo_fichaje(
  timestamp_real timestamp with time zone,
  redondeo_minutos integer
) RETURNS timestamp with time zone
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Crear función para validar geocerca
CREATE OR REPLACE FUNCTION public.validar_geocerca(
  lat_empleado numeric,
  lng_empleado numeric,
  ubicacion_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ubicacion_data RECORD;
  distancia_metros numeric;
BEGIN
  -- Obtener datos de la ubicación
  SELECT latitud, longitud, radio_metros
  INTO ubicacion_data
  FROM public.fichado_ubicaciones
  WHERE id = ubicacion_id AND activa = true;
  
  -- Si no se encuentra la ubicación, denegar
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Si no hay coordenadas de empleado, denegar
  IF lat_empleado IS NULL OR lng_empleado IS NULL THEN
    RETURN false;
  END IF;
  
  -- Si no hay coordenadas de ubicación, permitir
  IF ubicacion_data.latitud IS NULL OR ubicacion_data.longitud IS NULL THEN
    RETURN true;
  END IF;
  
  -- Calcular distancia usando la fórmula haversine simplificada
  distancia_metros := 6371000 * acos(
    cos(radians(lat_empleado)) * 
    cos(radians(ubicacion_data.latitud)) * 
    cos(radians(ubicacion_data.longitud) - radians(lng_empleado)) + 
    sin(radians(lat_empleado)) * 
    sin(radians(ubicacion_data.latitud))
  );
  
  -- Verificar si está dentro del radio permitido
  RETURN distancia_metros <= COALESCE(ubicacion_data.radio_metros, 100);
END;
$$;