-- Función SECURITY DEFINER para subir fotos desde kiosco
CREATE OR REPLACE FUNCTION public.kiosk_upload_facial_photo(
  p_empleado_id uuid,
  p_photo_url text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Verificar que el empleado existe y está activo
  IF NOT EXISTS (
    SELECT 1 FROM empleados 
    WHERE id = p_empleado_id AND activo = true
  ) THEN
    RAISE EXCEPTION 'Empleado no encontrado o inactivo';
  END IF;

  -- Insertar el registro de foto
  INSERT INTO facial_photo_uploads (empleado_id, photo_url, estado)
  VALUES (p_empleado_id, p_photo_url, 'pendiente')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Permitir acceso anónimo y autenticado a esta función
GRANT EXECUTE ON FUNCTION public.kiosk_upload_facial_photo(uuid, text) TO anon, authenticated;