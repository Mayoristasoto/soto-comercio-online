-- Eliminar la política que permite a gerentes ver sus propias anotaciones
DROP POLICY IF EXISTS "Gerentes pueden ver sus propias anotaciones" ON public.empleados_anotaciones;

-- Los gerentes ya no podrán leer anotaciones, solo crearlas
-- Mantener solo las políticas de INSERT, UPDATE y DELETE para gerentes

-- Comentario para aclarar el modelo de permisos
COMMENT ON TABLE public.empleados_anotaciones IS 'Registro de anotaciones y observaciones sobre empleados. Los gerentes pueden crear anotaciones pero solo admin_rrhh puede ver el historial completo.';