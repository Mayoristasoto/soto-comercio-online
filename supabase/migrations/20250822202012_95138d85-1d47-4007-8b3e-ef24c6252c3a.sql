-- SOLUCION TEMPORAL: Deshabilitar RLS para permitir acceso público
-- Esto es para debugging y solucionar el problema inmediato
ALTER TABLE public.gondolas DISABLE ROW LEVEL SECURITY;

-- Verificar que la tabla sea accesible
SELECT COUNT(*) as total_gondolas FROM public.gondolas;