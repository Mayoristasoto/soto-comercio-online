CREATE OR REPLACE FUNCTION public.registrar_actividad_foto_recorrido_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recorrido_id uuid;
  v_punto_id uuid;
  v_zona_id uuid;
BEGIN
  SELECT h.recorrido_id, h.punto_id, h.zona_id
  INTO v_recorrido_id, v_punto_id, v_zona_id
  FROM public.recorrido_hallazgos h
  WHERE h.id = NEW.hallazgo_id;

  INSERT INTO public.recorrido_hallazgo_actividad
    (hallazgo_id, recorrido_id, punto_id, zona_id, accion, usuario_id)
  VALUES
    (NEW.hallazgo_id, v_recorrido_id, v_punto_id, v_zona_id, 'foto_agregada', COALESCE(NEW.subido_por, auth.uid()));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_actividad_foto_recorrido_v2() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_actividad_foto_recorrido_v2() TO service_role;
CREATE TRIGGER trg_registrar_actividad_foto_recorrido_v2
AFTER INSERT ON public.recorrido_hallazgo_fotos
FOR EACH ROW EXECUTE FUNCTION public.registrar_actividad_foto_recorrido_v2();