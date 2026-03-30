
-- Tablero Kanban: columnas y tarjetas

CREATE TABLE public.tablero_columnas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.empleados(id)
);

CREATE TABLE public.tablero_tarjetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  columna_id UUID REFERENCES public.tablero_columnas(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  prioridad public.tarea_prioridad DEFAULT 'media',
  categoria_id UUID REFERENCES public.tareas_categorias(id),
  delegado_a UUID REFERENCES public.empleados(id),
  created_by UUID REFERENCES public.empleados(id),
  fecha_limite DATE,
  orden INT NOT NULL DEFAULT 0,
  etiquetas TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.tablero_columnas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tablero_tarjetas ENABLE ROW LEVEL SECURITY;

-- Columnas: admins full access
CREATE POLICY "admins_full_columnas" ON public.tablero_columnas
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Tarjetas: admins full access
CREATE POLICY "admins_full_tarjetas" ON public.tablero_tarjetas
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Default columns
INSERT INTO public.tablero_columnas (nombre, orden, color) VALUES
  ('💡 Ideas', 0, '#8b5cf6'),
  ('📋 Por Hacer', 1, '#3b82f6'),
  ('🔄 En Progreso', 2, '#f59e0b'),
  ('✅ Completado', 3, '#22c55e');
