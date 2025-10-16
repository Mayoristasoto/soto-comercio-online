-- Enable RLS on empleados_basic view by making it security invoker
-- This ensures RLS policies from the underlying empleados table are applied

-- Drop and recreate the view with security_invoker = true
DROP VIEW IF EXISTS public.empleados_basic;

CREATE VIEW public.empleados_basic 
WITH (security_invoker = true)
AS
SELECT 
  e.id,
  e.rol,
  e.sucursal_id,
  e.grupo_id,
  e.activo,
  e.fecha_ingreso,
  e.created_at,
  e.updated_at,
  e.nombre,
  e.apellido,
  e.email,
  e.avatar_url,
  e.legajo,
  e.puesto
FROM public.empleados e;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "employees_view_own_basic_data" ON public.empleados;
DROP POLICY IF EXISTS "managers_view_branch_basic_data" ON public.empleados;
DROP POLICY IF EXISTS "admins_view_all_basic_data" ON public.empleados;

-- Policy: Employees can view their own basic record
CREATE POLICY "employees_view_own_basic_data"
ON public.empleados
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Managers can view basic data of employees in their branch
CREATE POLICY "managers_view_branch_basic_data"
ON public.empleados
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.empleados manager
    WHERE manager.user_id = auth.uid()
      AND manager.rol = 'gerente_sucursal'
      AND manager.activo = true
      AND manager.sucursal_id = empleados.sucursal_id
  )
);

-- Policy: Admins can view all basic employee data
CREATE POLICY "admins_view_all_basic_data"
ON public.empleados
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.empleados admin
    WHERE admin.user_id = auth.uid()
      AND admin.rol = 'admin_rrhh'
      AND admin.activo = true
  )
);