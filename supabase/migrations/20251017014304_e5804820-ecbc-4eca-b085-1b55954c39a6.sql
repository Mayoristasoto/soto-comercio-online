-- Permitir visualización pública de participaciones para pantalla TV
-- Esta política permite que cualquier usuario autenticado vea las participaciones
CREATE POLICY "Usuarios autenticados pueden ver todas las participaciones"
ON public.participaciones
FOR SELECT
TO authenticated
USING (true);