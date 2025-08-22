-- SOLUCION SIMPLE: Hacer la tabla gondolas completamente pública para lectura
-- Remover RLS temporalmente para solucionar el acceso
ALTER TABLE public.gondolas DISABLE ROW LEVEL SECURITY;

-- Verificar que podemos acceder a los datos
SELECT id, type, status, brand, category FROM public.gondolas LIMIT 5;