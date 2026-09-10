CREATE TABLE public.insumos_actividad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  empleado_id uuid,
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL,
  accion text NOT NULL,
  detalle text,
  fecha date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.insumos_actividad TO authenticated;
GRANT ALL ON public.insumos_actividad TO service_role;

ALTER TABLE public.insumos_actividad ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insumos_actividad_select_admin"
ON public.insumos_actividad FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin_rrhh'::user_role) OR user_id = auth.uid());

CREATE POLICY "insumos_actividad_insert_own"
ON public.insumos_actividad FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_insumos_actividad_fecha ON public.insumos_actividad (fecha DESC, created_at DESC);

CREATE OR REPLACE FUNCTION public.registrar_actividad_insumos(
  p_sucursal_id uuid,
  p_accion text,
  p_detalle text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_user uuid := auth.uid();
  v_rol user_role;
  v_emp uuid;
  v_nombre text;
  v_suc text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT role INTO v_rol FROM public.user_roles WHERE user_id = v_user LIMIT 1;

  SELECT id, trim(coalesce(nombre,'') || ' ' || coalesce(apellido,''))
    INTO v_emp, v_nombre
  FROM public.empleados WHERE user_id = v_user LIMIT 1;

  SELECT nombre INTO v_suc FROM public.sucursales WHERE id = p_sucursal_id;

  INSERT INTO public.insumos_actividad (user_id, empleado_id, sucursal_id, accion, detalle)
  VALUES (v_user, v_emp, p_sucursal_id, p_accion, p_detalle)
  RETURNING id INTO v_id;

  IF v_rol IS DISTINCT FROM 'admin_rrhh'::user_role THEN
    INSERT INTO public.notificaciones (usuario_id, titulo, mensaje, tipo, metadata)
    SELECT ur.user_id,
           CASE WHEN p_accion = 'guardado'
                THEN 'Control de insumos guardado'
                ELSE 'Ingreso a control de insumos' END,
           coalesce(nullif(v_nombre,''), 'Un encargado') || ' — ' ||
           coalesce(v_suc, 'sin sucursal') ||
           CASE WHEN p_detalle IS NOT NULL THEN ' · ' || p_detalle ELSE '' END,
           'insumos',
           jsonb_build_object('actividad_id', v_id, 'sucursal_id', p_sucursal_id, 'accion', p_accion)
    FROM public.user_roles ur
    WHERE ur.role = 'admin_rrhh'::user_role;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_actividad_insumos(uuid, text, text) TO authenticated;