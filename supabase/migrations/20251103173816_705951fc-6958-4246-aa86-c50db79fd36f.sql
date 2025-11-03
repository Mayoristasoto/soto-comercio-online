-- Eliminar la política anterior del kiosco que no funciona correctamente
DROP POLICY IF EXISTS "Kiosco puede crear registros de fotos" ON public.facial_photo_uploads;

-- Crear nueva política más específica para el kiosco (usuarios no autenticados)
CREATE POLICY "Kiosco puede crear registros sin autenticación"
ON public.facial_photo_uploads
FOR INSERT
TO public
WITH CHECK (
  auth.uid() IS NULL
  AND empleado_id IS NOT NULL
  AND estado = 'pendiente'
);

-- Actualizar la política de empleados para que solo aplique a usuarios autenticados
DROP POLICY IF EXISTS "Empleados pueden subir sus fotos" ON public.facial_photo_uploads;

CREATE POLICY "Empleados autenticados pueden subir sus fotos"
ON public.facial_photo_uploads
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND empleado_id = get_current_empleado()
);