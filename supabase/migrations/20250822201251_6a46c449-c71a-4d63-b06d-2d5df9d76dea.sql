-- Permitir lectura pública de góndolas para la vista pública
-- Eliminamos la política restrictiva actual
DROP POLICY IF EXISTS "Public can view gondolas" ON public.gondolas;

-- Creamos una nueva política que permita lectura pública
CREATE POLICY "Public read access to gondolas" 
ON public.gondolas 
FOR SELECT 
USING (true);

-- Asegurar que las políticas de escritura siguen siendo solo para usuarios autenticados
-- (estas ya existen pero las reforzamos)
DROP POLICY IF EXISTS "Authenticated users only - insert gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "Authenticated users only - update gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "Authenticated users only - delete gondolas" ON public.gondolas;

CREATE POLICY "Authenticated users only - insert gondolas" 
ON public.gondolas 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users only - update gondolas" 
ON public.gondolas 
FOR UPDATE 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users only - delete gondolas" 
ON public.gondolas 
FOR DELETE 
USING (auth.uid() IS NOT NULL);