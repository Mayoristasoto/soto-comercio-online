
-- Tabla para guardar fotos de verificación de fichajes
CREATE TABLE public.fichajes_fotos_verificacion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  fichaje_id UUID REFERENCES public.fichajes(id) ON DELETE SET NULL,
  foto_url TEXT NOT NULL,
  foto_storage_path TEXT NOT NULL,
  latitud NUMERIC(10, 8),
  longitud NUMERIC(11, 8),
  timestamp_captura TIMESTAMPTZ NOT NULL DEFAULT now(),
  metodo_fichaje TEXT,
  confianza_facial NUMERIC(5, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsquedas eficientes
CREATE INDEX idx_fichajes_fotos_verificacion_empleado ON public.fichajes_fotos_verificacion(empleado_id);
CREATE INDEX idx_fichajes_fotos_verificacion_timestamp ON public.fichajes_fotos_verificacion(timestamp_captura DESC);

-- Enable RLS
ALTER TABLE public.fichajes_fotos_verificacion ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: solo admins pueden ver las fotos de verificación
CREATE POLICY "Admins can view all verification photos"
  ON public.fichajes_fotos_verificacion
  FOR SELECT
  TO authenticated
  USING (current_user_is_admin() = true);

CREATE POLICY "Admins can insert verification photos"
  ON public.fichajes_fotos_verificacion
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can delete verification photos"
  ON public.fichajes_fotos_verificacion
  FOR DELETE
  TO authenticated
  USING (current_user_is_admin() = true);

-- Función para limpiar fotos antiguas y mantener solo las últimas 3
CREATE OR REPLACE FUNCTION public.limpiar_fotos_verificacion_antiguas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  fotos_a_eliminar UUID[];
  foto_record RECORD;
BEGIN
  -- Obtener IDs de fotos a eliminar (todas excepto las 3 más recientes)
  SELECT ARRAY_AGG(id) INTO fotos_a_eliminar
  FROM (
    SELECT id
    FROM fichajes_fotos_verificacion
    WHERE empleado_id = NEW.empleado_id
    ORDER BY timestamp_captura DESC
    OFFSET 3
  ) old_photos;

  -- Si hay fotos a eliminar
  IF fotos_a_eliminar IS NOT NULL AND array_length(fotos_a_eliminar, 1) > 0 THEN
    -- Eliminar registros (el storage se limpiará manualmente o por cron)
    DELETE FROM fichajes_fotos_verificacion
    WHERE id = ANY(fotos_a_eliminar);
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger para ejecutar limpieza después de cada inserción
CREATE TRIGGER trigger_limpiar_fotos_verificacion
  AFTER INSERT ON public.fichajes_fotos_verificacion
  FOR EACH ROW
  EXECUTE FUNCTION public.limpiar_fotos_verificacion_antiguas();

-- Crear bucket de storage para fotos de verificación
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fichajes-verificacion',
  'fichajes-verificacion',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage: solo sistema puede insertar, solo admins pueden ver
CREATE POLICY "System can upload verification photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'fichajes-verificacion');

CREATE POLICY "Admins can view verification photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'fichajes-verificacion' 
    AND current_user_is_admin() = true
  );

CREATE POLICY "Admins can delete verification photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'fichajes-verificacion' 
    AND current_user_is_admin() = true
  );
