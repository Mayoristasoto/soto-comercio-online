
CREATE OR REPLACE FUNCTION public.kiosk_get_empleado_flags(p_empleado_id uuid)
RETURNS TABLE(gps_obligatorio boolean, liveness_obligatorio boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(gps_obligatorio,false), COALESCE(liveness_obligatorio,false)
  FROM public.empleados WHERE id = p_empleado_id;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_get_empleado_flags(uuid) TO anon, authenticated;
