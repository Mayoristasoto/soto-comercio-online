INSERT INTO public.facial_recognition_config (key, value, description)
VALUES ('pin_liveness_required', 'false', 'Si está activo, exige prueba de vida (parpadeo) para todos los check-ins con PIN')
ON CONFLICT (key) DO NOTHING;