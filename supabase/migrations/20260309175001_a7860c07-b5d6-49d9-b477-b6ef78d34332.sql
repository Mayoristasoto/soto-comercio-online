CREATE POLICY "Empleados pueden ver sus plantillas asignadas"
ON public.tareas_plantillas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM empleados
    WHERE empleados.user_id = auth.uid()
    AND empleados.id = ANY(tareas_plantillas.empleados_asignados::uuid[])
  )
);