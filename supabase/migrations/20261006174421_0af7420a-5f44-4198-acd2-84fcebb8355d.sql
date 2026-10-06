ALTER TABLE public.documentos_obligatorios ADD COLUMN IF NOT EXISTS puesto_id uuid REFERENCES public.puestos(id) ON DELETE SET NULL;

CREATE TABLE public.reuniones_disponibilidad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  duracion_min integer NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reuniones_disponibilidad TO authenticated;
GRANT ALL ON public.reuniones_disponibilidad TO service_role;
ALTER TABLE public.reuniones_disponibilidad ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RRHH gestiona disponibilidad" ON public.reuniones_disponibilidad FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin_rrhh')) WITH CHECK (public.has_role(auth.uid(),'admin_rrhh'));

CREATE TABLE public.reuniones_cierre (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  estado text NOT NULL DEFAULT 'programada',
  origen text NOT NULL DEFAULT 'manual',
  nota text,
  temas_empleado text,
  reglamento_firmado boolean NOT NULL DEFAULT false,
  informe_entregado boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.reuniones_cierre (fecha, hora_inicio);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reuniones_cierre TO authenticated;
GRANT ALL ON public.reuniones_cierre TO service_role;
ALTER TABLE public.reuniones_cierre ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RRHH gestiona reuniones" ON public.reuniones_cierre FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin_rrhh')) WITH CHECK (public.has_role(auth.uid(),'admin_rrhh'));
CREATE POLICY "Empleado ve su reunion" ON public.reuniones_cierre FOR SELECT TO authenticated
  USING (empleado_id = public.current_empleado_id());

CREATE TRIGGER trg_reuniones_disp_upd BEFORE UPDATE ON public.reuniones_disponibilidad FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_reuniones_cierre_upd BEFORE UPDATE ON public.reuniones_cierre FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Documentos de ingreso: reglamento (por config) + descripción del puesto del empleado
CREATE OR REPLACE FUNCTION public.docs_ingreso_empleado(p_empleado_id uuid)
RETURNS TABLE(documento_id uuid, titulo text, tipo text, url_archivo text, contenido text, firmado boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT d.id, d.titulo, CASE WHEN d.puesto_id IS NULL THEN 'reglamento' ELSE 'puesto' END, d.url_archivo, d.contenido,
    EXISTS (SELECT 1 FROM documentos_firmas f WHERE f.documento_id=d.id AND f.empleado_id=p_empleado_id)
  FROM documentos_obligatorios d
  WHERE d.activo AND (
    d.id::text = (SELECT valor FROM fichado_configuracion WHERE clave='reglamento_documento_id')
    OR (d.tipo_documento='descripcion_puesto' AND d.puesto_id = (SELECT puesto_id FROM empleados WHERE id=p_empleado_id)))
$$;
GRANT EXECUTE ON FUNCTION public.docs_ingreso_empleado(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.kiosk_reglamento_pendiente(p_empleado_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT coalesce((SELECT valor='true' FROM fichado_configuracion WHERE clave='reglamento_obligatorio_activo'),false)
   AND EXISTS (SELECT 1 FROM public.docs_ingreso_empleado(p_empleado_id) x WHERE NOT x.firmado)
$$;

CREATE OR REPLACE FUNCTION public.activar_reglamento_interno()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_n integer := 0; v_x integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin_rrhh') THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  INSERT INTO asignaciones_documentos_obligatorios (documento_id, empleado_id, activa)
  SELECT x.documento_id, e.id, true FROM empleados e CROSS JOIN LATERAL public.docs_ingreso_empleado(e.id) x
  WHERE e.activo AND NOT EXISTS (SELECT 1 FROM asignaciones_documentos_obligatorios a WHERE a.documento_id=x.documento_id AND a.empleado_id=e.id);
  GET DIAGNOSTICS v_x = ROW_COUNT; v_n := v_x;
  UPDATE empleados e SET debe_firmar_documentos_iniciales=true WHERE e.activo
    AND EXISTS (SELECT 1 FROM public.docs_ingreso_empleado(e.id) x WHERE NOT x.firmado);
  UPDATE fichado_configuracion SET valor='true', updated_at=now() WHERE clave='reglamento_obligatorio_activo';
  RETURN v_n;
END $$;

DROP FUNCTION IF EXISTS public.estado_firmas_reglamento();
CREATE FUNCTION public.estado_firmas_reglamento()
RETURNS TABLE(empleado_id uuid, nombre text, sucursal text, puesto text, reglamento boolean, descripcion_puesto boolean, tiene_descripcion boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT e.id, e.apellido||' '||e.nombre, s.nombre, p.nombre,
    coalesce(bool_or(x.firmado) FILTER (WHERE x.tipo='reglamento'), false),
    coalesce(bool_or(x.firmado) FILTER (WHERE x.tipo='puesto'), false),
    bool_or(x.tipo='puesto') IS TRUE
  FROM empleados e LEFT JOIN sucursales s ON s.id=e.sucursal_id LEFT JOIN puestos p ON p.id=e.puesto_id
  LEFT JOIN LATERAL public.docs_ingreso_empleado(e.id) x ON true
  WHERE e.activo AND public.has_role(auth.uid(),'admin_rrhh')
  GROUP BY e.id, e.apellido, e.nombre, s.nombre, p.nombre
  ORDER BY 3,2
$$;
REVOKE EXECUTE ON FUNCTION public.estado_firmas_reglamento() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.estado_firmas_reglamento() TO authenticated;

-- Agenda automática: reparte empleados activos sin reunión en los huecos libres
CREATE OR REPLACE FUNCTION public.programar_reuniones_auto(p_sucursal_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d record; t time; v_fin time; emp record; v_n integer := 0;
  cur CURSOR FOR SELECT e.id FROM empleados e
    WHERE e.activo AND coalesce(e.solo_reporte_rapido,false)=false
      AND (p_sucursal_id IS NULL OR e.sucursal_id=p_sucursal_id)
      AND NOT EXISTS (SELECT 1 FROM reuniones_cierre r WHERE r.empleado_id=e.id AND r.estado IN ('programada','realizada'))
    ORDER BY e.sucursal_id, e.apellido, e.nombre;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin_rrhh') THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  OPEN cur;
  FOR d IN SELECT * FROM reuniones_disponibilidad WHERE fecha >= (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date ORDER BY fecha, hora_inicio LOOP
    t := d.hora_inicio;
    WHILE t + make_interval(mins => d.duracion_min) <= d.hora_fin LOOP
      v_fin := t + make_interval(mins => d.duracion_min);
      IF NOT EXISTS (SELECT 1 FROM reuniones_cierre r WHERE r.fecha=d.fecha AND r.estado='programada' AND r.hora_inicio < v_fin AND r.hora_fin > t) THEN
        FETCH cur INTO emp;
        IF NOT FOUND THEN CLOSE cur; RETURN v_n; END IF;
        INSERT INTO reuniones_cierre (empleado_id, fecha, hora_inicio, hora_fin, origen, created_by) VALUES (emp.id, d.fecha, t, v_fin, 'automatica', auth.uid());
        v_n := v_n + 1;
      END IF;
      t := v_fin;
    END LOOP;
  END LOOP;
  CLOSE cur;
  RETURN v_n;
END $$;
REVOKE EXECUTE ON FUNCTION public.programar_reuniones_auto(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.programar_reuniones_auto(uuid) TO authenticated;