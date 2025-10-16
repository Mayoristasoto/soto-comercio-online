-- Fix remaining recursion: remove branch-based manager SELECT policy referencing empleados
DROP POLICY IF EXISTS "Managers can view branch employees" ON public.empleados;

-- Replace with a non-recursive temporary policy: managers can view all employees
CREATE POLICY "Managers can view all employees (temporary)"
ON public.empleados
FOR SELECT
USING (has_role(auth.uid(), 'gerente_sucursal'));

-- Ensure admin and self policies remain (idempotent safety)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='empleados' AND policyname='Admins can view all employees'
  ) THEN
    CREATE POLICY "Admins can view all employees"
    ON public.empleados
    FOR SELECT
    USING (current_user_is_admin());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='empleados' AND policyname='Employees can view own data'
  ) THEN
    CREATE POLICY "Employees can view own data"
    ON public.empleados
    FOR SELECT
    USING (user_id = auth.uid());
  END IF;
END $$;