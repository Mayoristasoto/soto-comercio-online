-- Agregar campos para archivos y links en puesto_documentos
ALTER TABLE public.puesto_documentos 
ADD COLUMN url_externo TEXT,
ADD COLUMN archivo_storage_path TEXT;

-- Comentarios para documentar los campos
COMMENT ON COLUMN public.puesto_documentos.url_externo IS 'URL externa como Google Drive para el documento';
COMMENT ON COLUMN public.puesto_documentos.archivo_storage_path IS 'Ruta del archivo en Supabase Storage';

-- Función para asignar automáticamente documentos del puesto cuando se asigna un empleado
CREATE OR REPLACE FUNCTION public.asignar_documentos_puesto()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doc_record RECORD;
BEGIN
  -- Verificar que el puesto_id cambió (o es una nueva asignación)
  IF (TG_OP = 'INSERT' AND NEW.puesto_id IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND NEW.puesto_id IS DISTINCT FROM OLD.puesto_id AND NEW.puesto_id IS NOT NULL) THEN
    
    -- Obtener todos los documentos obligatorios del puesto
    FOR doc_record IN 
      SELECT 
        pd.id as documento_id,
        pd.titulo,
        pd.descripcion,
        pd.tipo_documento,
        pd.url_archivo,
        pd.url_externo,
        pd.archivo_storage_path,
        pd.contenido
      FROM public.puesto_documentos pd
      WHERE pd.puesto_id = NEW.puesto_id
        AND pd.obligatorio = true
        AND pd.activo = true
    LOOP
      -- Verificar si ya existe una asignación para evitar duplicados
      IF NOT EXISTS (
        SELECT 1 FROM public.asignaciones_documentos_obligatorios
        WHERE empleado_id = NEW.id
          AND documento_id IN (
            SELECT id FROM public.documentos_obligatorios 
            WHERE titulo = doc_record.titulo
          )
      ) THEN
        -- Crear o encontrar el documento obligatorio en la tabla global
        INSERT INTO public.documentos_obligatorios (
          titulo,
          descripcion,
          contenido,
          url_archivo,
          tipo_documento,
          activo
        ) VALUES (
          doc_record.titulo || ' - ' || NEW.puesto_id::text,
          COALESCE(doc_record.descripcion, '') || ' (Asignado automáticamente desde puesto)',
          doc_record.contenido,
          COALESCE(doc_record.url_externo, doc_record.url_archivo),
          doc_record.tipo_documento,
          true
        )
        ON CONFLICT DO NOTHING
        RETURNING id INTO doc_record.documento_id;
        
        -- Si el documento ya existía, obtener su ID
        IF doc_record.documento_id IS NULL THEN
          SELECT id INTO doc_record.documento_id
          FROM public.documentos_obligatorios
          WHERE titulo = doc_record.titulo || ' - ' || NEW.puesto_id::text
          LIMIT 1;
        END IF;
        
        -- Crear la asignación del documento al empleado
        IF doc_record.documento_id IS NOT NULL THEN
          INSERT INTO public.asignaciones_documentos_obligatorios (
            empleado_id,
            documento_id,
            fecha_limite,
            activa
          ) VALUES (
            NEW.id,
            doc_record.documento_id,
            CURRENT_DATE + INTERVAL '30 days', -- 30 días para leer/firmar
            true
          )
          ON CONFLICT (empleado_id, documento_id) 
          DO UPDATE SET 
            activa = true,
            fecha_limite = CURRENT_DATE + INTERVAL '30 days';
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para asignar documentos cuando se asigna o cambia el puesto de un empleado
DROP TRIGGER IF EXISTS trigger_asignar_documentos_puesto ON public.empleados;
CREATE TRIGGER trigger_asignar_documentos_puesto
  AFTER INSERT OR UPDATE OF puesto_id ON public.empleados
  FOR EACH ROW
  EXECUTE FUNCTION public.asignar_documentos_puesto();