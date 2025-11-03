-- Primero, eliminar todas las políticas que dependen de is_admin_or_manager()
DROP POLICY IF EXISTS "sensitive_insert_admin_or_manager" ON public.empleados_datos_sensibles;
DROP POLICY IF EXISTS "sensitive_select_admin_or_owner" ON public.empleados_datos_sensibles;
DROP POLICY IF EXISTS "sensitive_update_admin_or_manager" ON public.empleados_datos_sensibles;
DROP POLICY IF EXISTS "Admins or managers can insert document assignments" ON public.asignaciones_documentos_obligatorios;
DROP POLICY IF EXISTS "Admins or managers can select document assignments" ON public.asignaciones_documentos_obligatorios;

-- Ahora podemos eliminar y recrear la función
DROP FUNCTION IF EXISTS public.is_admin_or_manager() CASCADE;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM empleados 
    WHERE user_id = auth.uid() 
    AND rol IN ('admin_rrhh', 'gerente_sucursal')
    AND activo = true
  );
$$;

-- Recrear políticas para empleados_datos_sensibles
CREATE POLICY "sensitive_insert_admin_or_manager"
ON public.empleados_datos_sensibles
FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_manager());

CREATE POLICY "sensitive_select_admin_or_owner"
ON public.empleados_datos_sensibles
FOR SELECT
TO authenticated
USING (
  is_admin_or_manager() 
  OR empleado_id = get_current_empleado()
);

CREATE POLICY "sensitive_update_admin_or_manager"
ON public.empleados_datos_sensibles
FOR UPDATE
TO authenticated
USING (is_admin_or_manager())
WITH CHECK (is_admin_or_manager());

-- Recrear políticas para asignaciones_documentos_obligatorios
CREATE POLICY "Admins or managers can insert document assignments"
ON public.asignaciones_documentos_obligatorios
FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_manager());

CREATE POLICY "Admins or managers can select document assignments"
ON public.asignaciones_documentos_obligatorios
FOR SELECT
TO authenticated
USING (is_admin_or_manager());