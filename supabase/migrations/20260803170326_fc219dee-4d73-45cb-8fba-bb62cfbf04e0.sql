ALTER TABLE public.planificacion_semanal
  ADD COLUMN IF NOT EXISTS nombre text,
  ADD COLUMN IF NOT EXISTS aplicada_at timestamptz,
  ADD COLUMN IF NOT EXISTS aplicada_por uuid;

ALTER TABLE public.planificacion_semanal_detalle
  ADD COLUMN IF NOT EXISTS pausa_minutos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS horas_extras numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_hora_extra numeric,
  ADD COLUMN IF NOT EXISTS notas text,
  ADD COLUMN IF NOT EXISTS fecha date;

ALTER TABLE public.cambios_horario
  ADD COLUMN IF NOT EXISTS planificacion_id uuid REFERENCES public.planificacion_semanal(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_psd_planificacion ON public.planificacion_semanal_detalle(planificacion_id);
CREATE INDEX IF NOT EXISTS idx_ch_planificacion ON public.cambios_horario(planificacion_id);

CREATE OR REPLACE FUNCTION public.revertir_planificacion_semanal(_planificacion_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _n integer;
BEGIN
  IF NOT (public.is_admin_or_manager()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  DELETE FROM public.cambios_horario WHERE planificacion_id = _planificacion_id;
  GET DIAGNOSTICS _n = ROW_COUNT;
  UPDATE public.planificacion_semanal
     SET aplicada_at = NULL, aplicada_por = NULL, updated_at = now()
   WHERE id = _planificacion_id;
  RETURN _n;
END;
$$;

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
    empleado_id, fecha, hora_entrada, hora_salida, sucursal_id, motivo, estado, planificacion_id, creado_por
  )
  SELECT d.empleado_id,
         COALESCE(d.fecha, _inicio + ((CASE WHEN d.dia_semana = 0 THEN 7 ELSE d.dia_semana END) - 1)),
         d.hora_entrada,
         d.hora_salida,
         d.sucursal_id,
         COALESCE(d.notas, 'Planificación semanal'),
         'aprobado',
         _planificacion_id,
         auth.uid()
    FROM public.planificacion_semanal_detalle d
   WHERE d.planificacion_id = _planificacion_id;

  GET DIAGNOSTICS _n = ROW_COUNT;

  UPDATE public.planificacion_semanal
     SET aplicada_at = now(), aplicada_por = auth.uid(), updated_at = now()
   WHERE id = _planificacion_id;

  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.aplicar_planificacion_semanal(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.revertir_planificacion_semanal(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.aplicar_planificacion_semanal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revertir_planificacion_semanal(uuid) TO authenticated;