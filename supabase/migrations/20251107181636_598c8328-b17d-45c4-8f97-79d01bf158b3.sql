-- Create table for instructivo screenshots
CREATE TABLE IF NOT EXISTS public.instructivo_screenshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seccion TEXT NOT NULL UNIQUE,
  imagen_url TEXT,
  descripcion TEXT,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.instructivo_screenshots ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read screenshots
CREATE POLICY "Screenshots are viewable by everyone" 
ON public.instructivo_screenshots 
FOR SELECT 
USING (true);

-- Only authenticated users can insert/update/delete screenshots (we'll control with app logic)
CREATE POLICY "Authenticated users can manage screenshots" 
ON public.instructivo_screenshots 
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_instructivo_screenshots_updated_at
BEFORE UPDATE ON public.instructivo_screenshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default sections
INSERT INTO public.instructivo_screenshots (seccion, descripcion, orden) VALUES
('login', 'Pantalla de inicio de sesión', 1),
('dashboard', 'Dashboard personal del empleado', 2),
('tareas', 'Gestión de tareas', 3),
('capacitaciones', 'Capacitaciones y entrenamientos', 4),
('documentos', 'Documentos para firmar', 5),
('reconocimientos', 'Medallas y reconocimientos', 6),
('entregas', 'Entregas de elementos', 7),
('vacaciones', 'Solicitud de vacaciones', 8),
('navegacion', 'Navegación del sistema', 9),
('perfil', 'Perfil personal', 10),
('faq', 'Preguntas frecuentes', 11)
ON CONFLICT (seccion) DO NOTHING;