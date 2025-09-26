-- Crear política para permitir que gerentes deleguen tareas asignadas a ellos
CREATE POLICY "Gerentes can delegate tasks assigned to them" 
ON public.tareas 
FOR UPDATE 
USING (
  (asignado_a = get_current_empleado()) AND 
  (EXISTS (
    SELECT 1 
    FROM empleados e 
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'gerente_sucursal'::user_role 
    AND e.activo = true
  ))
)
WITH CHECK (
  (EXISTS (
    SELECT 1 
    FROM empleados e 
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'gerente_sucursal'::user_role 
    AND e.activo = true
  ))
);