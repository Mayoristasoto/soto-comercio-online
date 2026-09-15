DROP TRIGGER IF EXISTS trg_registrar_actividad_hallazgo_v2 ON public.recorrido_hallazgos;
DROP FUNCTION IF EXISTS public.registrar_actividad_hallazgo_v2();

CREATE OR REPLACE FUNCTION public.identificar_autor_hallazgo_v2()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.registrado_por := COALESCE(NEW.registrado_por, auth.uid());
  END IF;
  NEW.actualizado_por := COALESCE(auth.uid(), NEW.actualizado_por);
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.identificar_autor_hallazgo_v2() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.identificar_autor_hallazgo_v2() TO authenticated, service_role;

CREATE TRIGGER trg_identificar_autor_hallazgo_v2
BEFORE INSERT OR UPDATE ON public.recorrido_hallazgos
FOR EACH ROW EXECUTE FUNCTION public.identificar_autor_hallazgo_v2();

CREATE OR REPLACE FUNCTION public.registrar_actividad_hallazgo_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_accion text;
BEGIN
  v_accion := CASE
    WHEN TG_OP = 'INSERT' THEN 'registrado'
    WHEN NEW.estado IS DISTINCT FROM OLD.estado THEN 'calificacion_actualizada'
    WHEN NEW.observaciones IS DISTINCT FROM OLD.observaciones THEN 'observacion_actualizada'
    ELSE 'actualizado' END;
  INSERT INTO public.recorrido_hallazgo_actividad
    (hallazgo_id, recorrido_id, punto_id, zona_id, accion, estado, observaciones, usuario_id)
  VALUES
    (NEW.id, NEW.recorrido_id, NEW.punto_id, NEW.zona_id, v_accion, NEW.estado, NEW.observaciones, auth.uid());
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.registrar_actividad_hallazgo_v2() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_actividad_hallazgo_v2() TO service_role;

CREATE TRIGGER trg_registrar_actividad_hallazgo_v2
AFTER INSERT OR UPDATE OF estado, observaciones ON public.recorrido_hallazgos
FOR EACH ROW EXECUTE FUNCTION public.registrar_actividad_hallazgo_v2();