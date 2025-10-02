-- Ensure RLS is enabled
ALTER TABLE public.empleados_datos_sensibles ENABLE ROW LEVEL SECURITY;

-- Drop conflicting/overlapping policies to avoid restrictive AND behavior
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='empleados_datos_sensibles' 
      AND policyname='Admin RRHH can manage all sensitive data'
  ) THEN
    DROP POLICY "Admin RRHH can manage all sensitive data" ON public.empleados_datos_sensibles;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='empleados_datos_sensibles' 
      AND policyname='Admin and managers can insert sensitive data'
  ) THEN
    DROP POLICY "Admin and managers can insert sensitive data" ON public.empleados_datos_sensibles;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='empleados_datos_sensibles' 
      AND policyname='Admin and managers can update sensitive data'
  ) THEN
    DROP POLICY "Admin and managers can update sensitive data" ON public.empleados_datos_sensibles;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='empleados_datos_sensibles' 
      AND policyname='Admin and managers can view sensitive data'
  ) THEN
    DROP POLICY "Admin and managers can view sensitive data" ON public.empleados_datos_sensibles;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='empleados_datos_sensibles' 
      AND policyname='Employees can view own basic sensitive data'
  ) THEN
    DROP POLICY "Employees can view own basic sensitive data" ON public.empleados_datos_sensibles;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='empleados_datos_sensibles' 
      AND policyname='admin_rrhh_insert_sensitive'
  ) THEN
    DROP POLICY "admin_rrhh_insert_sensitive" ON public.empleados_datos_sensibles;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='empleados_datos_sensibles' 
      AND policyname='admin_rrhh_update_sensitive'
  ) THEN
    DROP POLICY "admin_rrhh_update_sensitive" ON public.empleados_datos_sensibles;
  END IF;
END$$;

-- Recreate clear, permissive policies
CREATE POLICY sensitive_insert_admin_or_manager
ON public.empleados_datos_sensibles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_manager());

CREATE POLICY sensitive_update_admin_or_manager
ON public.empleados_datos_sensibles
FOR UPDATE
TO authenticated
USING (public.is_admin_or_manager())
WITH CHECK (public.is_admin_or_manager());

CREATE POLICY sensitive_select_admin_or_owner
ON public.empleados_datos_sensibles
FOR SELECT
TO authenticated
USING (public.is_admin_or_manager() OR empleado_id = public.get_current_empleado());