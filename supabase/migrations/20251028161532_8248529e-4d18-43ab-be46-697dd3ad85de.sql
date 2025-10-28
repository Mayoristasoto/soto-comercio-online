-- Crear tabla de plantillas de elementos
CREATE TABLE IF NOT EXISTS public.plantillas_elementos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo_elemento TEXT NOT NULL,
  campos_adicionales JSONB DEFAULT '[]'::jsonb,
  template_html TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plantillas_elementos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admin RRHH puede gestionar plantillas"
  ON public.plantillas_elementos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
      AND e.rol = 'admin_rrhh'
      AND e.activo = true
    )
  );

CREATE POLICY "Usuarios autenticados pueden ver plantillas activas"
  ON public.plantillas_elementos
  FOR SELECT
  USING (activo = true AND auth.uid() IS NOT NULL);

-- Agregar columna plantilla_id a entregas_elementos
ALTER TABLE public.entregas_elementos 
ADD COLUMN IF NOT EXISTS plantilla_id UUID REFERENCES public.plantillas_elementos(id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_plantillas_elementos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_plantillas_elementos_updated_at
  BEFORE UPDATE ON public.plantillas_elementos
  FOR EACH ROW
  EXECUTE FUNCTION update_plantillas_elementos_updated_at();