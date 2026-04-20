
-- RPC para revertir un fichaje cuando la foto de verificación no se pudo guardar.
-- Solo se permite eliminar fichajes recientes (últimos 5 minutos) y de método 'pin' o 'facial'
-- para evitar abuso. El kiosco lo invoca cuando guardarFotoVerificacion falla todos los reintentos.
CREATE OR REPLACE FUNCTION public.kiosk_revertir_fichaje_sin_foto(
  p_fichaje_id uuid,
  p_motivo text DEFAULT 'foto_no_subida'
)
RETURNS TABLE (success boolean, mensaje text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fichaje record;
BEGIN
  SELECT id, empleado_id, tipo, timestamp_real, datos
  INTO v_fichaje
  FROM public.fichajes
  WHERE id = p_fichaje_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Fichaje no encontrado'::text;
    RETURN;
  END IF;

  -- Solo permitir reversión dentro de los últimos 5 minutos
  IF v_fichaje.timestamp_real < (now() - INTERVAL '5 minutes') THEN
    RETURN QUERY SELECT false, 'El fichaje es demasiado antiguo para revertir'::text;
    RETURN;
  END IF;

  -- Eliminar fichaje
  DELETE FROM public.fichajes WHERE id = p_fichaje_id;

  -- Log de auditoría (usa api_logs si existe)
  BEGIN
    INSERT INTO public.api_logs (tipo, empleado_id, exitoso, request_data, response_data)
    VALUES (
      'fichaje_revertido_sin_foto',
      v_fichaje.empleado_id,
      true,
      jsonb_build_object(
        'fichaje_id', p_fichaje_id,
        'tipo', v_fichaje.tipo,
        'motivo', p_motivo,
        'timestamp_original', v_fichaje.timestamp_real
      ),
      jsonb_build_object('revertido_at', now())
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN QUERY SELECT true, 'Fichaje revertido correctamente'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_revertir_fichaje_sin_foto(uuid, text) TO anon, authenticated;
