-- Make kiosk_guardar_foto_verificacion overwrite any existing pending rows for the same fichaje
CREATE OR REPLACE FUNCTION public.kiosk_guardar_foto_verificacion(
  p_fichaje_id uuid,
  p_empleado_id uuid,
  p_foto_url text,
  p_foto_storage_path text,
  p_metodo text DEFAULT 'pin'::text,
  p_latitud double precision DEFAULT NULL::double precision,
  p_longitud double precision DEFAULT NULL::double precision
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
BEGIN
  -- Ensure a single record per fichaje: replace any previous placeholder/pending row
  DELETE FROM public.fichajes_fotos_verificacion
  WHERE fichaje_id = p_fichaje_id;

  INSERT INTO public.fichajes_fotos_verificacion (
    fichaje_id,
    empleado_id,
    foto_url,
    foto_storage_path,
    metodo_fichaje,
    latitud,
    longitud
  ) VALUES (
    p_fichaje_id,
    p_empleado_id,
    p_foto_url,
    p_foto_storage_path,
    p_metodo,
    p_latitud,
    p_longitud
  );

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Foto de verificación guardada correctamente'
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$function$;