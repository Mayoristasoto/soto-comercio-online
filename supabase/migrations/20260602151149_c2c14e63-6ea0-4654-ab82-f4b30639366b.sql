CREATE TABLE public.categorias_justificacion_asistencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#95198d',
  orden integer NOT NULL DEFAULT 0,
  activa boolean NOT NULL DEFAULT true,
  es_justificada boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.categorias_justificacion_asistencia TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_justificacion_asistencia TO authenticated;
GRANT ALL ON public.categorias_justificacion_asistencia TO service_role;

ALTER TABLE public.categorias_justificacion_asistencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura categorias autenticados"
  ON public.categorias_justificacion_asistencia FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "Admin/RRHH gestiona categorias"
  ON public.categorias_justificacion_asistencia FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'::user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'::user_role));

CREATE TRIGGER trg_categorias_just_asistencia_updated
  BEFORE UPDATE ON public.categorias_justificacion_asistencia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.categorias_justificacion_asistencia (nombre, color, orden, es_justificada) VALUES
  ('Sin justificar', '#e04403', 0, false),
  ('Cambio de turno no actualizado', '#4b0d6d', 1, true),
  ('Turno médico', '#0d7a5f', 2, true),
  ('Trámite personal autorizado', '#95198d', 3, true),
  ('Falla técnica de fichaje', '#c9a84c', 4, true),
  ('Justificada (otro)', '#3b6fa0', 5, true);

CREATE TABLE public.justificaciones_asistencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_evento text NOT NULL CHECK (tipo_evento IN ('llegada_tarde','ausencia')),
  evento_ref_id uuid,
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  fecha_evento date NOT NULL,
  categoria_id uuid NOT NULL REFERENCES public.categorias_justificacion_asistencia(id),
  observacion text,
  creado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_just_asistencia_unico
  ON public.justificaciones_asistencia(tipo_evento, empleado_id, fecha_evento);
CREATE INDEX idx_just_asistencia_fecha ON public.justificaciones_asistencia(fecha_evento);
CREATE INDEX idx_just_asistencia_empleado ON public.justificaciones_asistencia(empleado_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.justificaciones_asistencia TO authenticated;
GRANT ALL ON public.justificaciones_asistencia TO service_role;

ALTER TABLE public.justificaciones_asistencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leen justificaciones"
  ON public.justificaciones_asistencia FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "Autenticados crean justificaciones"
  ON public.justificaciones_asistencia FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados actualizan justificaciones"
  ON public.justificaciones_asistencia FOR UPDATE
  TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin/RRHH eliminan justificaciones"
  ON public.justificaciones_asistencia FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'::user_role));

CREATE TRIGGER trg_just_asistencia_updated
  BEFORE UPDATE ON public.justificaciones_asistencia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_eventos_asistencia(
  p_desde date,
  p_hasta date,
  p_sucursales uuid[] DEFAULT NULL,
  p_empleados uuid[] DEFAULT NULL,
  p_tipos text[] DEFAULT ARRAY['llegada_tarde','ausencia']
)
RETURNS TABLE (
  evento_id uuid,
  tipo_evento text,
  empleado_id uuid,
  empleado_nombre text,
  empleado_apellido text,
  empleado_legajo text,
  sucursal_id uuid,
  sucursal_nombre text,
  fecha date,
  detalle text,
  minutos_retraso integer,
  hora_programada time,
  hora_real time,
  justificacion_id uuid,
  categoria_id uuid,
  categoria_nombre text,
  categoria_color text,
  es_justificada boolean,
  observacion text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF 'llegada_tarde' = ANY(p_tipos) THEN
    RETURN QUERY
    SELECT
      ft.id, 'llegada_tarde'::text,
      e.id, e.nombre, e.apellido, e.legajo,
      e.sucursal_id, s.nombre,
      ft.fecha_fichaje,
      ('Retraso de ' || ft.minutos_retraso || ' min')::text,
      ft.minutos_retraso, ft.hora_programada, ft.hora_real,
      j.id, j.categoria_id, c.nombre, c.color, c.es_justificada, j.observacion
    FROM public.fichajes_tardios ft
    JOIN public.empleados e ON e.id = ft.empleado_id
    LEFT JOIN public.sucursales s ON s.id = e.sucursal_id
    LEFT JOIN public.justificaciones_asistencia j
      ON j.tipo_evento = 'llegada_tarde'
     AND j.empleado_id = ft.empleado_id
     AND j.fecha_evento = ft.fecha_fichaje
    LEFT JOIN public.categorias_justificacion_asistencia c ON c.id = j.categoria_id
    WHERE ft.fecha_fichaje BETWEEN p_desde AND p_hasta
      AND e.activo = true
      AND (p_sucursales IS NULL OR e.sucursal_id = ANY(p_sucursales))
      AND (p_empleados IS NULL OR e.id = ANY(p_empleados));
  END IF;

  IF 'ausencia' = ANY(p_tipos) THEN
    RETURN QUERY
    SELECT
      gen_random_uuid(), 'ausencia'::text,
      n.empleado_id, n.empleado_nombre, n.empleado_apellido, n.empleado_legajo,
      n.sucursal_id, n.sucursal_nombre, n.fecha,
      'Sin fichaje registrado'::text,
      NULL::integer, n.hora_entrada_esperada, NULL::time,
      j.id, j.categoria_id, c.nombre, c.color, c.es_justificada, j.observacion
    FROM public.get_novedades_liquidacion(p_desde, p_hasta, p_sucursales, p_empleados) n
    LEFT JOIN public.justificaciones_asistencia j
      ON j.tipo_evento = 'ausencia'
     AND j.empleado_id = n.empleado_id
     AND j.fecha_evento = n.fecha
    LEFT JOIN public.categorias_justificacion_asistencia c ON c.id = j.categoria_id
    WHERE n.estado = 'NO_FICHADA';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_eventos_asistencia(date, date, uuid[], uuid[], text[]) TO authenticated;

INSERT INTO public.app_pages (path, nombre, titulo_pagina, descripcion, icon, orden, visible, requiere_auth, roles_permitidos, mostrar_en_sidebar, tipo)
VALUES (
  '/rrhh/informe-asistencia-gerencial',
  'Informe Asistencia Gerencial',
  'Informe gerencial de llegadas tarde y ausencias',
  'Reporte revisable y justificable de llegadas tarde y ausencias para presentar a gerencia',
  'FileBarChart',
  100, true, true,
  ARRAY['admin_rrhh','gerente_sucursal']::text[],
  true, 'link'
)
ON CONFLICT (path) DO NOTHING;