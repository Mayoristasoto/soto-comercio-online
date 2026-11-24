CREATE TABLE public.domingo_personal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  hora_entrada time NOT NULL,
  hora_salida time NOT NULL,
  observaciones text,
  cargado_por uuid,
  estado text NOT NULL DEFAULT 'cargado',
  comentario_rrhh text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fecha, empleado_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.domingo_personal TO authenticated;
GRANT ALL ON public.domingo_personal TO service_role;
ALTER TABLE public.domingo_personal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "domingo rrhh" ON public.domingo_personal FOR ALL TO authenticated
  USING (public.h2_es_rrhh()) WITH CHECK (public.h2_es_rrhh());
CREATE POLICY "domingo encargado ver" ON public.domingo_personal FOR SELECT TO authenticated
  USING (empleado_id IN (SELECT public.encargado_empleados_visibles(public.current_empleado_id())));
CREATE POLICY "domingo encargado cargar" ON public.domingo_personal FOR INSERT TO authenticated
  WITH CHECK (cargado_por = public.current_empleado_id() AND estado = 'cargado'
    AND empleado_id IN (SELECT public.encargado_empleados_visibles(public.current_empleado_id())));
CREATE POLICY "domingo encargado editar" ON public.domingo_personal FOR UPDATE TO authenticated
  USING (empleado_id IN (SELECT public.encargado_empleados_visibles(public.current_empleado_id())))
  WITH CHECK (estado = 'cargado' AND empleado_id IN (SELECT public.encargado_empleados_visibles(public.current_empleado_id())));
CREATE POLICY "domingo encargado quitar" ON public.domingo_personal FOR DELETE TO authenticated
  USING (empleado_id IN (SELECT public.encargado_empleados_visibles(public.current_empleado_id())));