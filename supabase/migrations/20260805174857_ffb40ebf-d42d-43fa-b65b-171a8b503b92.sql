-- 1. Sucursal en la planificación semanal
ALTER TABLE public.planificacion_semanal
  ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL;

-- Una planificación por sucursal y semana (antes: una por semana global)
ALTER TABLE public.planificacion_semanal
  DROP CONSTRAINT IF EXISTS planificacion_semanal_fecha_inicio_semana_key;
DROP INDEX IF EXISTS public.planificacion_semanal_fecha_inicio_semana_key;

CREATE UNIQUE INDEX IF NOT EXISTS planificacion_semanal_suc_semana_key
  ON public.planificacion_semanal (sucursal_id, fecha_inicio_semana)
  WHERE sucursal_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS planificacion_semanal_global_semana_key
  ON public.planificacion_semanal (fecha_inicio_semana)
  WHERE sucursal_id IS NULL;

-- 2. Grants (por si faltaban para el rol autenticado)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planificacion_semanal TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planificacion_semanal_detalle TO authenticated;
GRANT ALL ON public.planificacion_semanal TO service_role;
GRANT ALL ON public.planificacion_semanal_detalle TO service_role;

-- 3. Políticas para gerentes de sucursal (escritura limitada a su sucursal y estado editable)
DROP POLICY IF EXISTS "Gerentes crean planificacion de su sucursal" ON public.planificacion_semanal;
CREATE POLICY "Gerentes crean planificacion de su sucursal"
  ON public.planificacion_semanal FOR INSERT TO authenticated
  WITH CHECK (
    public.is_gerente_sucursal()
    AND sucursal_id IS NOT NULL
    AND sucursal_id = public.current_user_sucursal_id()
    AND coalesce(estado, 'borrador') IN ('borrador', 'pendiente_aprobacion')
  );

DROP POLICY IF EXISTS "Gerentes editan planificacion de su sucursal" ON public.planificacion_semanal;
CREATE POLICY "Gerentes editan planificacion de su sucursal"
  ON public.planificacion_semanal FOR UPDATE TO authenticated
  USING (
    public.is_gerente_sucursal()
    AND sucursal_id = public.current_user_sucursal_id()
    AND coalesce(estado, 'borrador') IN ('borrador', 'rechazada')
  )
  WITH CHECK (
    public.is_gerente_sucursal()
    AND sucursal_id = public.current_user_sucursal_id()
    AND coalesce(estado, 'borrador') IN ('borrador', 'rechazada', 'pendiente_aprobacion')
  );

DROP POLICY IF EXISTS "Gerentes borran planificacion de su sucursal" ON public.planificacion_semanal;
CREATE POLICY "Gerentes borran planificacion de su sucursal"
  ON public.planificacion_semanal FOR DELETE TO authenticated
  USING (
    public.is_gerente_sucursal()
    AND sucursal_id = public.current_user_sucursal_id()
    AND coalesce(estado, 'borrador') IN ('borrador', 'rechazada')
  );

-- 4. Políticas de detalle para gerentes
DROP POLICY IF EXISTS "Gerentes gestionan detalle de su planificacion" ON public.planificacion_semanal_detalle;
CREATE POLICY "Gerentes gestionan detalle de su planificacion"
  ON public.planificacion_semanal_detalle FOR ALL TO authenticated
  USING (
    public.is_gerente_sucursal()
    AND EXISTS (
      SELECT 1 FROM public.planificacion_semanal ps
      WHERE ps.id = planificacion_semanal_detalle.planificacion_id
        AND ps.sucursal_id = public.current_user_sucursal_id()
        AND coalesce(ps.estado, 'borrador') IN ('borrador', 'rechazada')
    )
  )
  WITH CHECK (
    public.is_gerente_sucursal()
    AND EXISTS (
      SELECT 1 FROM public.planificacion_semanal ps
      WHERE ps.id = planificacion_semanal_detalle.planificacion_id
        AND ps.sucursal_id = public.current_user_sucursal_id()
        AND coalesce(ps.estado, 'borrador') IN ('borrador', 'rechazada')
    )
  );

-- 5. Enviar a validación de RRHH
CREATE OR REPLACE FUNCTION public.enviar_planificacion_a_validacion(p_planificacion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suc uuid;
  v_estado text;
BEGIN
  SELECT sucursal_id, coalesce(estado, 'borrador')
    INTO v_suc, v_estado
  FROM public.planificacion_semanal
  WHERE id = p_planificacion_id;

  IF v_suc IS NULL AND NOT public.is_admin_rrhh() THEN
    RAISE EXCEPTION 'Planificación inexistente o sin sucursal asignada';
  END IF;

  IF NOT public.is_admin_rrhh()
     AND NOT (public.is_gerente_sucursal() AND v_suc = public.current_user_sucursal_id()) THEN
    RAISE EXCEPTION 'No tiene permisos sobre esta planificación';
  END IF;

  IF v_estado NOT IN ('borrador', 'rechazada', 'pendiente_aprobacion') THEN
    RAISE EXCEPTION 'La planificación ya fue procesada (estado: %)', v_estado;
  END IF;

  UPDATE public.planificacion_semanal
     SET estado = 'pendiente_aprobacion',
         aprobada_at = NULL,
         aprobada_por = NULL,
         motivo_rechazo = NULL,
         updated_at = now()
   WHERE id = p_planificacion_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enviar_planificacion_a_validacion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enviar_planificacion_a_validacion(uuid) TO authenticated;

-- 6. Aprobar / rechazar (solo RRHH)
CREATE OR REPLACE FUNCTION public.resolver_planificacion(
  p_planificacion_id uuid,
  p_aprobar boolean,
  p_motivo text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emp uuid;
BEGIN
  IF NOT public.is_admin_rrhh() THEN
    RAISE EXCEPTION 'Solo RRHH puede aprobar o rechazar planificaciones';
  END IF;

  SELECT id INTO v_emp FROM public.empleados WHERE user_id = auth.uid() LIMIT 1;

  IF p_aprobar THEN
    UPDATE public.planificacion_semanal
       SET estado = 'aprobada',
           aprobada_at = now(),
           aprobada_por = v_emp,
           motivo_rechazo = NULL,
           updated_at = now()
     WHERE id = p_planificacion_id;
  ELSE
    UPDATE public.planificacion_semanal
       SET estado = 'rechazada',
           aprobada_at = NULL,
           aprobada_por = NULL,
           motivo_rechazo = p_motivo,
           updated_at = now()
     WHERE id = p_planificacion_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.resolver_planificacion(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolver_planificacion(uuid, boolean, text) TO authenticated;