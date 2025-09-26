-- Actualizar políticas RLS para permitir delegación de tareas

-- Eliminar políticas existentes que puedan estar limitando
DROP POLICY IF EXISTS "Admins can manage all tasks" ON public.tareas;
DROP POLICY IF EXISTS "Empleados pueden actualizar estado de sus tareas" ON public.tareas;
DROP POLICY IF EXISTS "Empleados pueden ver sus tareas asignadas" ON public.tareas;

-- Política para que admin_rrhh pueda gestionar todas las tareas
CREATE POLICY "Admin RRHH can manage all tasks" ON public.tareas
FOR ALL USING (
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

-- Política para que gerentes puedan crear tareas para empleados de su sucursal
CREATE POLICY "Gerentes can create tasks for their branch employees" ON public.tareas
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.empleados e1
    JOIN public.empleados e2 ON e1.sucursal_id = e2.sucursal_id
    WHERE e1.user_id = auth.uid() 
    AND e1.rol = 'gerente_sucursal' 
    AND e1.activo = true
    AND e2.id = asignado_a
    AND e2.activo = true
  ) OR
  EXISTS (
    SELECT 1 FROM public.empleados e 
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh' 
    AND e.activo = true
  )
);

-- Política para que gerentes puedan ver tareas de su sucursal
CREATE POLICY "Gerentes can view tasks in their branch" ON public.tareas
FOR SELECT USING (
  -- Admin puede ver todas las tareas
  EXISTS (
    SELECT 1 FROM public.empleados e 
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh' 
    AND e.activo = true
  ) OR
  -- Gerentes pueden ver tareas de su sucursal
  EXISTS (
    SELECT 1 FROM public.empleados e1
    JOIN public.empleados e2 ON e1.sucursal_id = e2.sucursal_id
    WHERE e1.user_id = auth.uid() 
    AND e1.rol = 'gerente_sucursal' 
    AND e1.activo = true
    AND (e2.id = asignado_a OR e2.id = asignado_por)
  ) OR
  -- Empleados pueden ver sus propias tareas
  asignado_a = get_current_empleado() OR
  asignado_por = get_current_empleado()
);

-- Política para actualizar estado de tareas asignadas
CREATE POLICY "Empleados can update their assigned tasks status" ON public.tareas
FOR UPDATE USING (
  asignado_a = get_current_empleado()
)
WITH CHECK (
  asignado_a = get_current_empleado()
);

-- Política para que creadores puedan actualizar sus tareas creadas
CREATE POLICY "Task creators can update their tasks" ON public.tareas
FOR UPDATE USING (
  asignado_por = get_current_empleado() OR
  EXISTS (
    SELECT 1 FROM public.empleados e 
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh' 
    AND e.activo = true
  )
)
WITH CHECK (
  asignado_por = get_current_empleado() OR
  EXISTS (
    SELECT 1 FROM public.empleados e 
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh' 
    AND e.activo = true
  )
);