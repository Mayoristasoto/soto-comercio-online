CREATE OR REPLACE FUNCTION public.aplicar_planificacion_semanal(_planificacion_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _n integer := 0;
  _inicio date;
BEGIN
  IF NOT (public.is_admin_or_manager()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT fecha_inicio_semana INTO _inicio
    FROM public.planificacion_semanal WHERE id = _planificacion_id;
  IF _inicio IS NULL THEN
    RAISE EXCEPTION 'Planificación no encontrada';
  END IF;

  DELETE FROM public.cambios_horario WHERE planificacion_id = _planificacion_id;

  INSERT INTO public.cambios_horario (
    empleado_id, solicitado_por, fecha, tipo_cambio,
    hora_entrada_nueva, hora_salida_nueva, justificacion, estado, planificacion_id
  )
  SELECT d.empleado_id,
         COALESCE(auth.uid(), d.empleado_id),
         COALESCE(d.fecha, _inicio + ((CASE WHEN d.dia_semana = 0 THEN 7 ELSE d.dia_semana END) - 1)),
         'manual',
         d.hora_entrada,
         d.hora_salida,
         COALESCE(NULLIF(d.notas, ''), 'Planificación semanal'),
         'aprobado',
         _planificacion_id
    FROM public.planificacion_semanal_detalle d
   WHERE d.planificacion_id = _planificacion_id;

  GET DIAGNOSTICS _n = ROW_COUNT;

  UPDATE public.planificacion_semanal
     SET aplicada_at = now(), aplicada_por = auth.uid(), updated_at = now()
   WHERE id = _planificacion_id;

  RETURN _n;
END;
$$;