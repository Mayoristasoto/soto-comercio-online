-- Permitir a empleados crear solicitudes desde kiosco (sin auth)
CREATE POLICY "Empleados pueden crear solicitudes desde kiosco"
ON public.solicitudes_generales
FOR INSERT
WITH CHECK (
  -- Verificar que el empleado existe y está activo
  EXISTS (
    SELECT 1 FROM public.empleados
    WHERE id = empleado_id
    AND activo = true
  )
);