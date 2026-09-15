ALTER TABLE public.recorrido_hallazgos
  ADD COLUMN IF NOT EXISTS registrado_por uuid,
  ADD COLUMN IF NOT EXISTS actualizado_por uuid;

ALTER TABLE public.recorrido_hallazgo_fotos
  ADD COLUMN IF NOT EXISTS subido_por uuid;

UPDATE public.recorrido_hallazgos h
SET registrado_por = COALESCE(h.registrado_por, r.created_by, r.responsable_id),
    actualizado_por = COALESCE(h.actualizado_por, r.created_by, r.responsable_id)
FROM public.recorridos r
WHERE r.id = h.recorrido_id;

CREATE TABLE public.recorrido_hallazgo_actividad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hallazgo_id uuid NOT NULL REFERENCES public.recorrido_hallazgos(id) ON DELETE CASCADE,
  recorrido_id uuid NOT NULL REFERENCES public.recorridos(id) ON DELETE CASCADE,
  punto_id uuid REFERENCES public.recorrido_puntos(id) ON DELETE SET NULL,
  zona_id uuid REFERENCES public.recorrido_zonas(id) ON DELETE SET NULL,
  accion text NOT NULL,
  estado public.checklist_estado_item,
  observaciones text,
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recorrido_hallazgo_actividad TO authenticated;
GRANT ALL ON public.recorrido_hallazgo_actividad TO service_role;
ALTER TABLE public.recorrido_hallazgo_actividad ENABLE ROW LEVEL SECURITY;

CREATE POLICY "actividad_recorrido_v2_admin_lee" ON public.recorrido_hallazgo_actividad
FOR SELECT TO authenticated USING (public.is_admin_rrhh());
CREATE POLICY "actividad_recorrido_v2_gerente_lee" ON public.recorrido_hallazgo_actividad
FOR SELECT TO authenticated USING (EXISTS (
  SELECT 1 FROM public.recorridos r WHERE r.id = recorrido_hallazgo_actividad.recorrido_id
  AND public.is_gerente_de_sucursal(r.sucursal_id)
));

CREATE OR REPLACE FUNCTION public.registrar_actividad_hallazgo_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_usuario uuid := auth.uid(); v_accion text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.registrado_por := COALESCE(NEW.registrado_por, v_usuario);
    NEW.actualizado_por := COALESCE(NEW.actualizado_por, v_usuario);
    v_accion := 'registrado';
  ELSE
    NEW.actualizado_por := COALESCE(v_usuario, NEW.actualizado_por);
    v_accion := CASE
      WHEN NEW.estado IS DISTINCT FROM OLD.estado THEN 'calificacion_actualizada'
      WHEN NEW.observaciones IS DISTINCT FROM OLD.observaciones THEN 'observacion_actualizada'
      ELSE 'actualizado' END;
  END IF;
  INSERT INTO public.recorrido_hallazgo_actividad
    (hallazgo_id, recorrido_id, punto_id, zona_id, accion, estado, observaciones, usuario_id)
  VALUES (NEW.id, NEW.recorrido_id, NEW.punto_id, NEW.zona_id, v_accion, NEW.estado, NEW.observaciones, v_usuario);
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.registrar_actividad_hallazgo_v2() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_actividad_hallazgo_v2() TO service_role;
CREATE TRIGGER trg_registrar_actividad_hallazgo_v2
BEFORE INSERT OR UPDATE OF estado, observaciones ON public.recorrido_hallazgos
FOR EACH ROW EXECUTE FUNCTION public.registrar_actividad_hallazgo_v2();

CREATE OR REPLACE FUNCTION public.identificar_autor_foto_recorrido_v2()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.subido_por := COALESCE(NEW.subido_por, auth.uid()); RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION public.identificar_autor_foto_recorrido_v2() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.identificar_autor_foto_recorrido_v2() TO authenticated, service_role;
CREATE TRIGGER trg_identificar_autor_foto_recorrido_v2
BEFORE INSERT ON public.recorrido_hallazgo_fotos
FOR EACH ROW EXECUTE FUNCTION public.identificar_autor_foto_recorrido_v2();

CREATE POLICY "hallazgo_fotos_v2_gerente_all" ON public.recorrido_hallazgo_fotos
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.recorrido_hallazgos h JOIN public.recorridos r ON r.id = h.recorrido_id
  WHERE h.id = recorrido_hallazgo_fotos.hallazgo_id AND public.is_gerente_de_sucursal(r.sucursal_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.recorrido_hallazgos h JOIN public.recorridos r ON r.id = h.recorrido_id
  WHERE h.id = recorrido_hallazgo_fotos.hallazgo_id AND public.is_gerente_de_sucursal(r.sucursal_id)
));

CREATE POLICY "gerente_gestiona_fotos_recorrido_v2_storage" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'checklist-evidencias' AND (storage.foldername(name))[1] = 'recorridos-v2'
  AND EXISTS (
    SELECT 1 FROM public.recorrido_hallazgos h JOIN public.recorridos r ON r.id = h.recorrido_id
    WHERE h.id::text = (storage.foldername(name))[2] AND public.is_gerente_de_sucursal(r.sucursal_id)
  )
)
WITH CHECK (
  bucket_id = 'checklist-evidencias' AND (storage.foldername(name))[1] = 'recorridos-v2'
  AND EXISTS (
    SELECT 1 FROM public.recorrido_hallazgos h JOIN public.recorridos r ON r.id = h.recorrido_id
    WHERE h.id::text = (storage.foldername(name))[2] AND public.is_gerente_de_sucursal(r.sucursal_id)
  )
);