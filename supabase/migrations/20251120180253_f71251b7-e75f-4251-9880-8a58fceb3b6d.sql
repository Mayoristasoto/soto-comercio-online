-- Crear tabla para almacenar imágenes de cumpleaños generadas
CREATE TABLE IF NOT EXISTS public.imagenes_cumpleanos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  imagen_url TEXT NOT NULL,
  fecha_generacion TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(empleado_id)
);

-- Habilitar RLS
ALTER TABLE public.imagenes_cumpleanos ENABLE ROW LEVEL SECURITY;

-- Política para que todos los usuarios autenticados puedan ver las imágenes
CREATE POLICY "Todos pueden ver imágenes de cumpleaños"
  ON public.imagenes_cumpleanos
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para que solo admin_rrhh pueda insertar/actualizar
CREATE POLICY "Admin RRHH puede gestionar imágenes"
  ON public.imagenes_cumpleanos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.empleados
      WHERE empleados.user_id = auth.uid()
      AND empleados.rol = 'admin_rrhh'
    )
  );

-- Crear índice para búsquedas rápidas
CREATE INDEX idx_imagenes_cumpleanos_empleado ON public.imagenes_cumpleanos(empleado_id);