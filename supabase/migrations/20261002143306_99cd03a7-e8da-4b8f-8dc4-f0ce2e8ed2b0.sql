CREATE TABLE public.perfiles_vista_usuario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nombre TEXT NOT NULL,
  es_default BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfiles_vista_usuario TO authenticated;
GRANT ALL ON public.perfiles_vista_usuario TO service_role;

ALTER TABLE public.perfiles_vista_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cada usuario gestiona sus perfiles de vista"
ON public.perfiles_vista_usuario
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX perfiles_vista_un_default_por_usuario
ON public.perfiles_vista_usuario (user_id)
WHERE es_default = true;

CREATE TRIGGER update_perfiles_vista_updated_at
BEFORE UPDATE ON public.perfiles_vista_usuario
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();