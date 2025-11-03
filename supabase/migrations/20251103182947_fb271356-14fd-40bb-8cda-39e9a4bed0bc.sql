-- Ensure RLS and privileges for empleados_datos_sensibles to allow upsert by authenticated admins (controlled by policies)
-- 1) Enable RLS on the table (safe if already enabled)
ALTER TABLE public.empleados_datos_sensibles ENABLE ROW LEVEL SECURITY;

-- 2) Ensure the authenticated role has basic privileges; RLS will still enforce row access
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.empleados_datos_sensibles TO authenticated;

-- 3) Ensure a unique constraint on empleado_id for ON CONFLICT upsert
CREATE UNIQUE INDEX IF NOT EXISTS empleados_datos_sensibles_empleado_id_key
ON public.empleados_datos_sensibles (empleado_id);

-- 4) Recreate RLS policies explicitly for clarity
DROP POLICY IF EXISTS "sensitive_insert_admin_or_manager" ON public.empleados_datos_sensibles;
DROP POLICY IF EXISTS "sensitive_select_admin_or_owner" ON public.empleados_datos_sensibles;
DROP POLICY IF EXISTS "sensitive_update_admin_or_manager" ON public.empleados_datos_sensibles;

-- INSERT: only admins or managers
CREATE POLICY "sensitive_insert_admin_or_manager"
ON public.empleados_datos_sensibles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_manager());

-- SELECT: admins/managers or the employee themself
CREATE POLICY "sensitive_select_admin_or_owner"
ON public.empleados_datos_sensibles
FOR SELECT
TO authenticated
USING (
  public.is_admin_or_manager() OR empleado_id = public.get_current_empleado()
);

-- UPDATE: only admins or managers
CREATE POLICY "sensitive_update_admin_or_manager"
ON public.empleados_datos_sensibles
FOR UPDATE
TO authenticated
USING (public.is_admin_or_manager())
WITH CHECK (public.is_admin_or_manager());
