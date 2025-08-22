-- Configurar realtime para la tabla gondolas
ALTER TABLE public.gondolas REPLICA IDENTITY FULL;

-- Añadir la tabla a la publicación de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.gondolas;