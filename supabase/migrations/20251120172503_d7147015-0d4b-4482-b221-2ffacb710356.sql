-- Crear tabla para preferencias de tema del usuario
CREATE TABLE IF NOT EXISTS public.user_theme_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_mode VARCHAR(20) DEFAULT 'system', -- 'light', 'dark', 'system'
  custom_colors JSONB, -- {primary: "...", secondary: "...", accent: "..."}
  font_size VARCHAR(20) DEFAULT 'normal', -- 'normal', 'large', 'xlarge'
  high_contrast BOOLEAN DEFAULT false,
  reduced_motion BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_theme_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas: usuarios solo pueden ver/editar sus propias preferencias
CREATE POLICY "Users can view their own theme preferences"
  ON public.user_theme_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own theme preferences"
  ON public.user_theme_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own theme preferences"
  ON public.user_theme_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_user_theme_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_theme_preferences_updated_at
  BEFORE UPDATE ON public.user_theme_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_theme_preferences_updated_at();