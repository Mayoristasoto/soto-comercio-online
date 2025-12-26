-- Security fix: remove overly-permissive public read on configuration
DROP POLICY IF EXISTS "Allow public read access to configuration" ON public.fichado_configuracion;

-- Kiosk-safe config accessor (only allowlisted keys)
CREATE OR REPLACE FUNCTION public.get_kiosk_config_value(p_clave text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_valor text;
BEGIN
  -- Allowlist: only non-secret, kiosk-relevant keys
  IF p_clave NOT IN (
    'pin_habilitado',
    'pin_foto_obligatoria',
    'pin_longitud_minima',
    'pin_longitud_maxima',
    'pin_max_intentos',
    'pin_bloqueo_minutos',
    'permite_fichaje_offline',
    'geocerca_obligatoria',
    'umbral_confianza_facial',
    'max_intentos_facial',
    'kiosko_mostrar_cruces_rojas',
    'audio_checkin_activo',
    'audio_tareas_pendientes_activo'
  ) THEN
    RAISE EXCEPTION 'Config key not allowed for kiosk';
  END IF;

  SELECT valor INTO v_valor
  FROM public.fichado_configuracion
  WHERE clave = p_clave
  LIMIT 1;

  RETURN v_valor;
END;
$$;

-- Security fix: prevent anonymous direct uploads to verification bucket
DROP POLICY IF EXISTS "System can upload verification photos" ON storage.objects;

-- Data hygiene: remove duplicates and pending entries in verification photos
WITH ranked AS (
  SELECT
    id,
    fichaje_id,
    ROW_NUMBER() OVER (
      PARTITION BY fichaje_id
      ORDER BY (foto_url = 'pending_upload') ASC, timestamp_captura DESC
    ) AS rn
  FROM public.fichajes_fotos_verificacion
  WHERE fichaje_id IS NOT NULL
)
DELETE FROM public.fichajes_fotos_verificacion f
USING ranked r
WHERE f.id = r.id
  AND r.rn > 1;

DELETE FROM public.fichajes_fotos_verificacion
WHERE foto_url = 'pending_upload';

-- Enforce 1 photo per fichaje going forward
CREATE UNIQUE INDEX IF NOT EXISTS fichajes_fotos_verificacion_unique_fichaje
ON public.fichajes_fotos_verificacion (fichaje_id)
WHERE fichaje_id IS NOT NULL;