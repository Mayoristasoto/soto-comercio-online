CREATE TABLE public.atencion_metricas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  hora smallint,
  chats integer NOT NULL DEFAULT 0,
  chats_sin_respuesta integer NOT NULL DEFAULT 0,
  primera_respuesta_min numeric,
  resolucion_min numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX atencion_metricas_unica_dia ON public.atencion_metricas (empleado_id, fecha) WHERE hora IS NULL;
CREATE UNIQUE INDEX atencion_metricas_unica_hora ON public.atencion_metricas (empleado_id, fecha, hora) WHERE hora IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.atencion_metricas TO authenticated;
GRANT ALL ON public.atencion_metricas TO service_role;

ALTER TABLE public.atencion_metricas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RRHH gestiona metricas de atencion"
ON public.atencion_metricas FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin_rrhh'))
WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));

CREATE POLICY "Empleado ve sus metricas de atencion"
ON public.atencion_metricas FOR SELECT TO authenticated
USING (empleado_id = public.current_empleado_id());

CREATE TRIGGER atencion_metricas_updated_at
BEFORE UPDATE ON public.atencion_metricas
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();