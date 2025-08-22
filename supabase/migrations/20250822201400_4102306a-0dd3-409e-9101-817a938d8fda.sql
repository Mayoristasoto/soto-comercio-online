-- Verificar las políticas actuales y forzar actualización
-- Deshabilitar RLS temporalmente para probar
ALTER TABLE public.gondolas DISABLE ROW LEVEL SECURITY;

-- Volver a habilitar RLS
ALTER TABLE public.gondolas ENABLE ROW LEVEL SECURITY;

-- Limpiar todas las políticas existentes y recrearlas
DROP POLICY IF EXISTS "Public read access to gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "Authenticated users only - insert gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "Authenticated users only - update gondolas" ON public.gondolas;  
DROP POLICY IF EXISTS "Authenticated users only - delete gondolas" ON public.gondolas;

-- Crear política de lectura pública muy simple
CREATE POLICY "allow_public_read_gondolas"
ON public.gondolas 
FOR SELECT 
TO public
USING (true);

-- Políticas para usuarios autenticados
CREATE POLICY "allow_authenticated_insert_gondolas"
ON public.gondolas 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "allow_authenticated_update_gondolas"
ON public.gondolas 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_authenticated_delete_gondolas"
ON public.gondolas 
FOR DELETE 
TO authenticated
USING (true);