-- Crear bucket para logos de marcas
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-logos', 'brand-logos', true);

-- Crear tabla para marcas
CREATE TABLE public.brand_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.brand_partners ENABLE ROW LEVEL SECURITY;

-- Políticas para lectura pública (para mostrar en la landing)
CREATE POLICY "Brands are publicly viewable" 
ON public.brand_partners 
FOR SELECT 
USING (is_active = true);

-- Políticas para edición autenticada
CREATE POLICY "Authenticated users can manage brands" 
ON public.brand_partners 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Políticas para storage de logos
CREATE POLICY "Brand logos are publicly viewable" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'brand-logos');

CREATE POLICY "Authenticated users can upload brand logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'brand-logos');

CREATE POLICY "Authenticated users can update brand logos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'brand-logos');

CREATE POLICY "Authenticated users can delete brand logos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'brand-logos');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_brand_partners_updated_at
BEFORE UPDATE ON public.brand_partners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar algunas marcas de ejemplo
INSERT INTO public.brand_partners (name, display_order) VALUES 
('Marca Lácteos', 1),
('Productos Premium', 2),
('Bebidas Top', 3),
('Snacks Elite', 4);