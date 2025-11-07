-- Agregar política de INSERT para tareas_configuracion
CREATE POLICY "Solo admin_rrhh puede insertar configuración de tareas"
ON public.tareas_configuracion
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.empleados
    WHERE empleados.user_id = auth.uid()
    AND empleados.rol = 'admin_rrhh'
  )
);

-- Actualizar función para tener search_path correcto
CREATE OR REPLACE FUNCTION public.update_tareas_configuracion_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;