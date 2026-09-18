ALTER TABLE public.insumos_control
  ADD COLUMN IF NOT EXISTS control_nro integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cerrado_at timestamptz,
  ADD COLUMN IF NOT EXISTS cerrado_por uuid;

ALTER TABLE public.insumos_control
  DROP CONSTRAINT IF EXISTS insumos_control_sucursal_id_insumo_id_fecha_key;

CREATE UNIQUE INDEX IF NOT EXISTS insumos_control_unico
  ON public.insumos_control (sucursal_id, insumo_id, fecha, control_nro);

CREATE OR REPLACE FUNCTION public.insumos_cerrar_control(
  p_sucursal_id uuid,
  p_fecha date,
  p_control_nro integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emp uuid;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  SELECT id INTO v_emp FROM public.empleados WHERE user_id = auth.uid() LIMIT 1;

  UPDATE public.insumos_control
     SET cerrado_at = now(),
         cerrado_por = COALESCE(v_emp, cerrado_por),
         updated_at = now()
   WHERE sucursal_id = p_sucursal_id
     AND fecha = p_fecha
     AND control_nro = p_control_nro
     AND cerrado_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.insumos_reabrir_control(
  p_sucursal_id uuid,
  p_fecha date,
  p_control_nro integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin_rrhh') THEN
    RAISE EXCEPTION 'Solo RRHH puede reabrir un control cerrado';
  END IF;

  UPDATE public.insumos_control
     SET cerrado_at = NULL,
         cerrado_por = NULL,
         updated_at = now()
   WHERE sucursal_id = p_sucursal_id
     AND fecha = p_fecha
     AND control_nro = p_control_nro;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.insumos_bloquear_cerrado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.cerrado_at IS NOT NULL AND NEW.cerrado_at IS NOT NULL THEN
    IF (NEW.cantidad IS DISTINCT FROM OLD.cantidad)
       OR (NEW.estado IS DISTINCT FROM OLD.estado)
       OR (NEW.necesita_reposicion IS DISTINCT FROM OLD.necesita_reposicion)
       OR (NEW.observaciones IS DISTINCT FROM OLD.observaciones) THEN
      RAISE EXCEPTION 'El control ya fue cerrado y no puede editarse';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_insumos_bloquear_cerrado ON public.insumos_control;
CREATE TRIGGER trg_insumos_bloquear_cerrado
  BEFORE UPDATE ON public.insumos_control
  FOR EACH ROW EXECUTE FUNCTION public.insumos_bloquear_cerrado();

GRANT EXECUTE ON FUNCTION public.insumos_cerrar_control(uuid, date, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insumos_reabrir_control(uuid, date, integer) TO authenticated;