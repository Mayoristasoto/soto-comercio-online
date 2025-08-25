-- Create table for viewport settings
CREATE TABLE public.layout_viewport (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  x NUMERIC NOT NULL DEFAULT 0,
  y NUMERIC NOT NULL DEFAULT 0,
  width NUMERIC NOT NULL DEFAULT 800,
  height NUMERIC NOT NULL DEFAULT 600,
  zoom NUMERIC NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for graphic elements (shapes, text, etc.)
CREATE TABLE public.graphic_elements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'rectangle', 'circle', 'line', 'arrow', 'text'
  position_x NUMERIC NOT NULL,
  position_y NUMERIC NOT NULL,
  width NUMERIC DEFAULT 100,
  height NUMERIC DEFAULT 100,
  color TEXT DEFAULT '#000000',
  opacity NUMERIC DEFAULT 1,
  text_content TEXT,
  font_size NUMERIC DEFAULT 14,
  stroke_width NUMERIC DEFAULT 1,
  stroke_color TEXT DEFAULT '#000000',
  fill_color TEXT DEFAULT '#ffffff',
  rotation NUMERIC DEFAULT 0,
  z_index INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.layout_viewport ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graphic_elements ENABLE ROW LEVEL SECURITY;

-- Create policies for layout_viewport
CREATE POLICY "Public can view active viewport" 
ON public.layout_viewport 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Authenticated users can manage viewport" 
ON public.layout_viewport 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create policies for graphic_elements
CREATE POLICY "Public can view visible elements" 
ON public.graphic_elements 
FOR SELECT 
USING (is_visible = true);

CREATE POLICY "Authenticated users can manage elements" 
ON public.graphic_elements 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_layout_viewport_updated_at
BEFORE UPDATE ON public.layout_viewport
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_graphic_elements_updated_at
BEFORE UPDATE ON public.graphic_elements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default viewport
INSERT INTO public.layout_viewport (x, y, width, height, zoom, is_active) 
VALUES (0, 0, 800, 600, 1, true);