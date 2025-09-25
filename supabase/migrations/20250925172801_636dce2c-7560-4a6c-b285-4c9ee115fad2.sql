-- NOW REMOVE THE SECURITY DEFINER FUNCTION AND RECREATE ESSENTIAL POLICIES

-- 1. Drop the problematic function
DROP FUNCTION IF EXISTS public.current_user_is_admin() CASCADE;

-- 2. Recreate essential policies using direct role checks
-- Admin check pattern that will be reused
-- EXISTS(SELECT 1 FROM public.empleados WHERE user_id = auth.uid() AND rol = 'admin_rrhh' AND activo = true)

-- Essential Employee table policies
CREATE POLICY "Admins can manage all employees" 
ON public.empleados 
FOR ALL 
USING (
  EXISTS(
    SELECT 1 FROM public.empleados e2
    WHERE e2.user_id = auth.uid() 
    AND e2.rol = 'admin_rrhh'
    AND e2.activo = true
  )
)
WITH CHECK (
  EXISTS(
    SELECT 1 FROM public.empleados e2
    WHERE e2.user_id = auth.uid() 
    AND e2.rol = 'admin_rrhh'
    AND e2.activo = true
  )
);

CREATE POLICY "Employees can view own profile" 
ON public.empleados 
FOR SELECT 
USING (user_id = auth.uid() AND auth.uid() IS NOT NULL);

-- Essential Sensitive Data policies
CREATE POLICY "Admins can manage sensitive employee data" 
ON public.empleados_datos_sensibles 
FOR ALL 
USING (
  EXISTS(
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
)
WITH CHECK (
  EXISTS(
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
);

-- Essential Audit Log policies
CREATE POLICY "Admins can view audit logs" 
ON public.empleados_audit_log 
FOR SELECT 
USING (
  EXISTS(
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
);

-- Essential Fichajes policies for the system to work
CREATE POLICY "Admins can manage all fichajes" 
ON public.fichajes 
FOR ALL 
USING (
  EXISTS(
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
)
WITH CHECK (
  EXISTS(
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
);

-- Essential Task policies
CREATE POLICY "Admins can manage all tasks" 
ON public.tareas 
FOR ALL 
USING (
  EXISTS(
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
)
WITH CHECK (
  EXISTS(
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
);