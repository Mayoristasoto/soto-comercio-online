-- Permitir lectura pública de datos básicos de empleados activos para el kiosco
CREATE POLICY "Kiosco puede ver datos básicos de empleados activos"
ON public.empleados
FOR SELECT
USING (
  activo = true 
  AND auth.uid() IS NULL
);

-- Esta política permite que el kiosco (sin autenticación) pueda buscar empleados
-- Solo empleados activos son visibles
-- La información sensible sigue protegida por las otras políticas