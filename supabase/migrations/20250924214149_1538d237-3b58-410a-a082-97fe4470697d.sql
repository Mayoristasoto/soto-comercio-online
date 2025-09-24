-- Política para permitir a empleados crear sus propias asignaciones de premios (canje)
CREATE POLICY "Empleados pueden crear sus asignaciones de premios" 
ON public.asignaciones_premio 
FOR INSERT 
WITH CHECK (
  (beneficiario_tipo = 'empleado'::beneficiario_tipo) 
  AND (beneficiario_id = get_current_empleado())
);

-- Política para permitir a empleados actualizar el estado de sus asignaciones pendientes
CREATE POLICY "Empleados pueden actualizar sus asignaciones pendientes" 
ON public.asignaciones_premio 
FOR UPDATE 
USING (
  (beneficiario_tipo = 'empleado'::beneficiario_tipo) 
  AND (beneficiario_id = get_current_empleado())
  AND (estado = 'pendiente'::asignacion_estado)
)
WITH CHECK (
  (beneficiario_tipo = 'empleado'::beneficiario_tipo) 
  AND (beneficiario_id = get_current_empleado())
);