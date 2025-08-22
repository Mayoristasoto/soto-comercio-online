-- REACTIVAR RLS Y ARREGLAR POLÍTICAS CORRECTAMENTE
-- Paso 1: Reactivar Row Level Security
ALTER TABLE public.gondolas ENABLE ROW LEVEL SECURITY;

-- Paso 2: Eliminar todas las políticas existentes para empezar limpio
DROP POLICY IF EXISTS "allow_public_read_gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "allow_authenticated_insert_gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "allow_authenticated_update_gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "allow_authenticated_delete_gondolas" ON public.gondolas;

-- Paso 3: Crear políticas más específicas y funcionales
-- Permitir lectura a todos (incluso anónimos)
CREATE POLICY "Enable read access for all users"
ON public.gondolas 
FOR SELECT 
USING (true);

-- Permitir inserción solo a usuarios autenticados
CREATE POLICY "Enable insert for authenticated users only"
ON public.gondolas 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Permitir actualización solo a usuarios autenticados
CREATE POLICY "Enable update for authenticated users only"
ON public.gondolas 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Permitir eliminación solo a usuarios autenticados
CREATE POLICY "Enable delete for authenticated users only"
ON public.gondolas 
FOR DELETE 
TO authenticated
USING (true);

-- Paso 4: Verificar que las políticas estén funcionando
-- Test de lectura pública (debería funcionar)
SELECT COUNT(*) as total_gondolas FROM public.gondolas;