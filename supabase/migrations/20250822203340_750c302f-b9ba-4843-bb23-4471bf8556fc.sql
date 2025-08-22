-- SOLUCION DEFINITIVA PARA ACCESO PUBLICO
-- El problema parece ser que las políticas no están funcionando correctamente
-- Voy a usar una estrategia diferente: grant directo + políticas simples

-- Paso 1: Dar permisos básicos al rol anónimo
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.gondolas TO anon;

-- Paso 2: Verificar y limpiar políticas
DROP POLICY IF EXISTS "gondolas_select_policy" ON public.gondolas;
DROP POLICY IF EXISTS "gondolas_insert_policy" ON public.gondolas;
DROP POLICY IF EXISTS "gondolas_update_policy" ON public.gondolas;
DROP POLICY IF EXISTS "gondolas_delete_policy" ON public.gondolas;

-- Paso 3: Crear una política súper simple para lectura
CREATE POLICY "simple_select_policy" 
ON public.gondolas 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Paso 4: Políticas para autenticados
CREATE POLICY "auth_insert_policy" 
ON public.gondolas 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "auth_update_policy" 
ON public.gondolas 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "auth_delete_policy" 
ON public.gondolas 
FOR DELETE 
TO authenticated
USING (true);

-- Paso 5: Test directo de acceso
SELECT COUNT(*) as direct_access_test FROM public.gondolas;