-- REACTIVAR RLS CON POLÍTICAS CORRECTAS
-- Paso 1: Reactivar Row Level Security
ALTER TABLE public.gondolas ENABLE ROW LEVEL SECURITY;

-- Paso 2: Limpiar políticas existentes
DROP POLICY IF EXISTS "Allow public read access to gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "Allow authenticated users to insert gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "Allow authenticated users to update gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "Allow authenticated users to delete gondolas" ON public.gondolas;

-- Paso 3: Crear políticas específicas para cada rol
-- Permitir lectura a TODOS (anónimos y autenticados)
CREATE POLICY "gondolas_select_policy"
ON public.gondolas 
FOR SELECT 
USING (true);

-- Permitir inserción solo a usuarios autenticados
CREATE POLICY "gondolas_insert_policy"
ON public.gondolas 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Permitir actualización solo a usuarios autenticados
CREATE POLICY "gondolas_update_policy"
ON public.gondolas 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Permitir eliminación solo a usuarios autenticados
CREATE POLICY "gondolas_delete_policy"
ON public.gondolas 
FOR DELETE 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Paso 4: Verificar que las políticas funcionan
-- Test como usuario anónimo
SELECT COUNT(*) as anonymous_access_test FROM public.gondolas;