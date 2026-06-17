ALTER TABLE public.vacaciones_bloqueos ADD COLUMN tipo TEXT NOT NULL DEFAULT 'total' CHECK (tipo IN ('total', 'informativo'));
