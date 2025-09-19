-- Primero eliminar todas las políticas existentes de empleados de forma forzada
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'empleados' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.empleados';
    END LOOP;
END$$;

-- Ahora crear las nuevas políticas de seguridad mejoradas

-- 1. Solo administradores pueden insertar nuevos empleados
CREATE POLICY "Solo admins pueden crear empleados"
ON public.empleados
FOR INSERT
TO authenticated
WITH CHECK (
  current_user_is_admin()
);

-- 2. Solo administradores pueden actualizar datos de empleados
CREATE POLICY "Solo admins pueden actualizar empleados"
ON public.empleados
FOR UPDATE
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- 3. Solo administradores pueden eliminar empleados
CREATE POLICY "Solo admins pueden eliminar empleados"
ON public.empleados
FOR DELETE
TO authenticated
USING (current_user_is_admin());

-- 4. Empleados solo pueden ver datos limitados de su propio perfil
CREATE POLICY "Empleados ven su perfil limitado"
ON public.empleados
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  AND auth.uid() IS NOT NULL
);

-- 5. Administradores pueden ver todos los empleados
CREATE POLICY "Admins ven todos los empleados"
ON public.empleados
FOR SELECT
TO authenticated
USING (current_user_is_admin());