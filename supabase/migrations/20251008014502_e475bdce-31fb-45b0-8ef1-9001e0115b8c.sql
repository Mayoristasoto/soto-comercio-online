-- Enable RLS on empleado_turnos if not already enabled
ALTER TABLE public.empleado_turnos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admin puede gestionar asignaciones de turnos" ON public.empleado_turnos;
DROP POLICY IF EXISTS "Gerentes pueden asignar turnos en su sucursal" ON public.empleado_turnos;
DROP POLICY IF EXISTS "Empleados pueden ver sus turnos asignados" ON public.empleado_turnos;
DROP POLICY IF EXISTS "Gerentes pueden actualizar turnos de su sucursal" ON public.empleado_turnos;

-- Admin can manage all shift assignments
CREATE POLICY "Admin puede gestionar asignaciones de turnos"
ON public.empleado_turnos
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid()
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid()
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
);

-- Managers can assign shifts to employees in their branch
CREATE POLICY "Gerentes pueden asignar turnos en su sucursal"
ON public.empleado_turnos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.empleados e_manager
    JOIN public.empleados e_employee ON e_manager.sucursal_id = e_employee.sucursal_id
    WHERE e_manager.user_id = auth.uid()
    AND e_manager.rol = 'gerente_sucursal'
    AND e_manager.activo = true
    AND e_employee.id = empleado_turnos.empleado_id
    AND e_employee.activo = true
  )
);

-- Managers can update shifts in their branch
CREATE POLICY "Gerentes pueden actualizar turnos de su sucursal"
ON public.empleado_turnos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.empleados e_manager
    JOIN public.empleados e_employee ON e_manager.sucursal_id = e_employee.sucursal_id
    WHERE e_manager.user_id = auth.uid()
    AND e_manager.rol = 'gerente_sucursal'
    AND e_manager.activo = true
    AND e_employee.id = empleado_turnos.empleado_id
    AND e_employee.activo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.empleados e_manager
    JOIN public.empleados e_employee ON e_manager.sucursal_id = e_employee.sucursal_id
    WHERE e_manager.user_id = auth.uid()
    AND e_manager.rol = 'gerente_sucursal'
    AND e_manager.activo = true
    AND e_employee.id = empleado_turnos.empleado_id
    AND e_employee.activo = true
  )
);

-- Employees can view their assigned shifts
CREATE POLICY "Empleados pueden ver sus turnos asignados"
ON public.empleado_turnos
FOR SELECT
TO authenticated
USING (
  empleado_id = get_current_empleado()
  OR EXISTS (
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid()
    AND e.rol IN ('admin_rrhh', 'gerente_sucursal')
    AND e.activo = true
  )
);