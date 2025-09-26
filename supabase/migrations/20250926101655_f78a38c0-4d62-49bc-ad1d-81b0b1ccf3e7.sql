-- 1) Crear trigger para crear registro sensible automáticamente al crear empleado
DROP TRIGGER IF EXISTS create_sensitive_on_empleado_insert ON public.empleados;
CREATE TRIGGER create_sensitive_on_empleado_insert
AFTER INSERT ON public.empleados
FOR EACH ROW
EXECUTE FUNCTION public.create_empleado_sensitive_record();

-- 2) Backfill: crear registros faltantes en empleados_datos_sensibles
INSERT INTO public.empleados_datos_sensibles (empleado_id)
SELECT e.id
FROM public.empleados e
LEFT JOIN public.empleados_datos_sensibles s ON s.empleado_id = e.id
WHERE s.empleado_id IS NULL
ON CONFLICT (empleado_id) DO NOTHING;

-- 3) Política explícita para INSERT por admin_rrhh
DROP POLICY IF EXISTS "admin_rrhh_insert_sensitive" ON public.empleados_datos_sensibles;
CREATE POLICY "admin_rrhh_insert_sensitive"
ON public.empleados_datos_sensibles
FOR INSERT
TO authenticated
WITH CHECK (current_user_is_admin());

-- 4) Política explícita para UPDATE por admin_rrhh
DROP POLICY IF EXISTS "admin_rrhh_update_sensitive" ON public.empleados_datos_sensibles;
CREATE POLICY "admin_rrhh_update_sensitive"
ON public.empleados_datos_sensibles
FOR UPDATE
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());