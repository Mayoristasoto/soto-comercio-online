-- Ensure RLS and privileges for empleados_rostros so admins/managers can manage
ALTER TABLE public.empleados_rostros ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.empleados_rostros TO authenticated;

-- Clean existing policies
DROP POLICY IF EXISTS "rostros_insert_admin_or_manager" ON public.empleados_rostros;
DROP POLICY IF EXISTS "rostros_select_admin_or_owner" ON public.empleados_rostros;
DROP POLICY IF EXISTS "rostros_update_admin_or_manager" ON public.empleados_rostros;

-- INSERT policy
CREATE POLICY "rostros_insert_admin_or_manager"
ON public.empleados_rostros
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_manager());

-- SELECT policy
CREATE POLICY "rostros_select_admin_or_owner"
ON public.empleados_rostros
FOR SELECT
TO authenticated
USING (
  public.is_admin_or_manager() OR empleado_id = public.get_current_empleado()
);

-- UPDATE policy
CREATE POLICY "rostros_update_admin_or_manager"
ON public.empleados_rostros
FOR UPDATE
TO authenticated
USING (public.is_admin_or_manager())
WITH CHECK (public.is_admin_or_manager());