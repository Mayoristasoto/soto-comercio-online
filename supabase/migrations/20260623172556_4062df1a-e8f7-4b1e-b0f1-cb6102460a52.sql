
ALTER TABLE public.empleados
  ADD COLUMN IF NOT EXISTS gps_obligatorio boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS liveness_obligatorio boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retener_fotos_recientes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retener_ubicaciones_recientes boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.empleados_ubicaciones_recientes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  lat double precision,
  lng double precision,
  accuracy double precision,
  metodo text NOT NULL DEFAULT 'pin',
  fichaje_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_ubic_rec_empleado_created
  ON public.empleados_ubicaciones_recientes(empleado_id, created_at DESC);

GRANT SELECT, INSERT ON public.empleados_ubicaciones_recientes TO authenticated;
GRANT ALL ON public.empleados_ubicaciones_recientes TO service_role;

ALTER TABLE public.empleados_ubicaciones_recientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins/RRHH leen ubicaciones recientes" ON public.empleados_ubicaciones_recientes;
CREATE POLICY "Admins/RRHH leen ubicaciones recientes"
  ON public.empleados_ubicaciones_recientes
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'::public.user_role));

DROP POLICY IF EXISTS "Service inserta ubicaciones recientes" ON public.empleados_ubicaciones_recientes;
CREATE POLICY "Service inserta ubicaciones recientes"
  ON public.empleados_ubicaciones_recientes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.purgar_ubicaciones_recientes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.empleados_ubicaciones_recientes
  WHERE empleado_id = NEW.empleado_id
    AND id NOT IN (
      SELECT id FROM public.empleados_ubicaciones_recientes
      WHERE empleado_id = NEW.empleado_id
      ORDER BY created_at DESC
      LIMIT 10
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purgar_ubicaciones_recientes ON public.empleados_ubicaciones_recientes;
CREATE TRIGGER trg_purgar_ubicaciones_recientes
AFTER INSERT ON public.empleados_ubicaciones_recientes
FOR EACH ROW EXECUTE FUNCTION public.purgar_ubicaciones_recientes();

CREATE OR REPLACE FUNCTION public.purgar_fotos_verificacion_recientes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retener boolean;
BEGIN
  SELECT retener_fotos_recientes INTO v_retener
  FROM public.empleados WHERE id = NEW.empleado_id;

  IF COALESCE(v_retener, false) THEN
    DELETE FROM public.fichajes_fotos_verificacion
    WHERE empleado_id = NEW.empleado_id
      AND id NOT IN (
        SELECT id FROM public.fichajes_fotos_verificacion
        WHERE empleado_id = NEW.empleado_id
        ORDER BY created_at DESC
        LIMIT 10
      );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purgar_fotos_recientes ON public.fichajes_fotos_verificacion;
CREATE TRIGGER trg_purgar_fotos_recientes
AFTER INSERT ON public.fichajes_fotos_verificacion
FOR EACH ROW EXECUTE FUNCTION public.purgar_fotos_verificacion_recientes();

CREATE OR REPLACE FUNCTION public.kiosk_registrar_ubicacion_reciente(
  p_empleado_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_accuracy double precision DEFAULT NULL,
  p_metodo text DEFAULT 'pin',
  p_fichaje_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retener boolean;
BEGIN
  SELECT retener_ubicaciones_recientes INTO v_retener
  FROM public.empleados WHERE id = p_empleado_id;

  IF COALESCE(v_retener, false) AND p_lat IS NOT NULL AND p_lng IS NOT NULL THEN
    INSERT INTO public.empleados_ubicaciones_recientes
      (empleado_id, lat, lng, accuracy, metodo, fichaje_id)
    VALUES
      (p_empleado_id, p_lat, p_lng, p_accuracy, COALESCE(p_metodo, 'pin'), p_fichaje_id);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.kiosk_registrar_ubicacion_reciente(uuid, double precision, double precision, double precision, text, uuid) TO anon, authenticated;

UPDATE public.empleados
SET gps_obligatorio = true,
    liveness_obligatorio = true,
    retener_fotos_recientes = true,
    retener_ubicaciones_recientes = true
WHERE id = '56cf495f-41ca-4615-8a57-05d62c429c9c';
