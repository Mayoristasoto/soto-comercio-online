-- Forzar refresh de caché y permisos
-- Reiniciar el rol public
NOTIFY pgrst, 'reload config';

-- Verificar que las políticas están activas
SELECT pg_reload_conf();

-- Insertar datos de prueba si no existen
INSERT INTO public.gondolas (id, type, position_x, position_y, position_width, position_height, status, brand, category, section, end_date, notes)
SELECT 'test_g1', 'gondola', 100, 100, 140, 60, 'available', null, 'Test', 'TEST1', null, 'Góndola de prueba'
WHERE NOT EXISTS (SELECT 1 FROM public.gondolas WHERE id = 'test_g1');