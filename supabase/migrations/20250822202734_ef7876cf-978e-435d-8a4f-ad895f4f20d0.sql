-- SOLUCION DEFINITIVA: Crear políticas que funcionen para usuarios anónimos
-- Problema: Las políticas anteriores no permiten acceso a usuarios anónimos (no autenticados)

-- Paso 1: Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Enable read access for all users" ON public.gondolas;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.gondolas;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.gondolas;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.gondolas;

-- Paso 2: Crear política de lectura que funcione para anónimos Y autenticados
CREATE POLICY "Allow public read access to gondolas"
ON public.gondolas 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Paso 3: Políticas para usuarios autenticados solamente
CREATE POLICY "Allow authenticated users to insert gondolas"
ON public.gondolas 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update gondolas"
ON public.gondolas 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete gondolas"
ON public.gondolas 
FOR DELETE 
TO authenticated
USING (true);

-- Paso 4: Verificar acceso anónimo
-- Simular una consulta como usuario anónimo
SET ROLE anon;
SELECT COUNT(*) as test_count FROM public.gondolas;
RESET ROLE;