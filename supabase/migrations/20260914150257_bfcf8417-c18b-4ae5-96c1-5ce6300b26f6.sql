CREATE TABLE public.recorrido_puntos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zona_id uuid NOT NULL REFERENCES public.recorrido_zonas(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  gondola_ref text,
  x numeric NOT NULL DEFAULT 0,
  y numeric NOT NULL DEFAULT 0,
  width numeric NOT NULL DEFAULT 10,
  height numeric NOT NULL DEFAULT 10,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recorrido_puntos TO authenticated;
GRANT ALL ON public.recorrido_puntos TO service_role;

ALTER TABLE public.recorrido_puntos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados ven puntos" ON public.recorrido_puntos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin RRHH gestiona puntos" ON public.recorrido_puntos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));

CREATE TRIGGER trg_recorrido_puntos_updated_at
  BEFORE UPDATE ON public.recorrido_puntos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_recorrido_puntos_zona ON public.recorrido_puntos(zona_id);

ALTER TABLE public.recorrido_hallazgos
  ADD COLUMN IF NOT EXISTS punto_id uuid REFERENCES public.recorrido_puntos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS punto_nombre text,
  ADD COLUMN IF NOT EXISTS sucursal_id uuid,
  ADD COLUMN IF NOT EXISTS estado_seguimiento text NOT NULL DEFAULT 'abierto',
  ADD COLUMN IF NOT EXISTS tarea_id uuid REFERENCES public.tareas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resuelto_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_recorrido_hallazgos_punto ON public.recorrido_hallazgos(punto_id);
CREATE INDEX IF NOT EXISTS idx_recorrido_hallazgos_sucursal ON public.recorrido_hallazgos(sucursal_id);

UPDATE public.recorrido_hallazgos h
SET sucursal_id = r.sucursal_id
FROM public.recorridos r
WHERE r.id = h.recorrido_id AND h.sucursal_id IS NULL;

ALTER TABLE public.checklist_control_items
  ADD COLUMN IF NOT EXISTS zona_id uuid REFERENCES public.recorrido_zonas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS punto_id uuid REFERENCES public.recorrido_puntos(id) ON DELETE SET NULL;

CREATE OR REPLACE VIEW public.historial_hallazgos_punto
WITH (security_invoker = true) AS
SELECT
  'recorrido'::text AS origen,
  h.id,
  h.punto_id,
  h.zona_id,
  h.sucursal_id,
  h.zona_nombre,
  h.punto_nombre,
  h.criterio_nombre AS detalle,
  h.estado::text AS estado,
  h.observaciones,
  h.estado_seguimiento,
  r.fecha_hora AS fecha,
  r.responsable_id,
  (SELECT count(*) FROM public.recorrido_hallazgo_fotos f WHERE f.hallazgo_id = h.id) AS fotos
FROM public.recorrido_hallazgos h
JOIN public.recorridos r ON r.id = h.recorrido_id
UNION ALL
SELECT
  'checklist'::text AS origen,
  i.id,
  i.punto_id,
  i.zona_id,
  c.sucursal_id,
  z.nombre AS zona_nombre,
  p.nombre AS punto_nombre,
  i.texto AS detalle,
  i.estado::text AS estado,
  i.observaciones,
  NULL::text AS estado_seguimiento,
  c.fecha_hora AS fecha,
  c.responsable_id,
  (SELECT count(*) FROM public.checklist_item_fotos f WHERE f.item_id = i.id) AS fotos
FROM public.checklist_control_items i
JOIN public.checklist_controles c ON c.id = i.control_id
LEFT JOIN public.recorrido_zonas z ON z.id = i.zona_id
LEFT JOIN public.recorrido_puntos p ON p.id = i.punto_id
WHERE i.punto_id IS NOT NULL OR i.zona_id IS NOT NULL;

GRANT SELECT ON public.historial_hallazgos_punto TO authenticated;