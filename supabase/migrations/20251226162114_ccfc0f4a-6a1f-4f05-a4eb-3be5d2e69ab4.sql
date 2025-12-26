-- Función para obtener configuración del kiosko de forma segura
CREATE OR REPLACE FUNCTION public.get_kiosk_config_value(p_clave TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor TEXT;
BEGIN
  SELECT valor INTO v_valor
  FROM fichado_configuracion
  WHERE clave = p_clave;
  
  RETURN COALESCE(v_valor, '');
END;
$$;

-- Permitir acceso anónimo a esta función
GRANT EXECUTE ON FUNCTION public.get_kiosk_config_value(TEXT) TO anon;

-- Función para guardar foto de verificación
CREATE OR REPLACE FUNCTION public.kiosk_guardar_foto_verificacion(
  p_fichaje_id UUID,
  p_empleado_id UUID,
  p_foto_url TEXT,
  p_foto_storage_path TEXT,
  p_metodo TEXT DEFAULT 'pin',
  p_latitud DOUBLE PRECISION DEFAULT NULL,
  p_longitud DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Insertar registro de foto de verificación
  INSERT INTO fichajes_fotos_verificacion (
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
$$;

-- Permitir acceso anónimo a esta función
GRANT EXECUTE ON FUNCTION public.kiosk_guardar_foto_verificacion(UUID, UUID, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO anon;