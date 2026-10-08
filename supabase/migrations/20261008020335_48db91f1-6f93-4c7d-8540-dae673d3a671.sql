CREATE TABLE public.autogestion_secciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave text NOT NULL UNIQUE,
  activo boolean NOT NULL DEFAULT true,
  orden int NOT NULL DEFAULT 0,
  titulo text NOT NULL,
  descripcion text,
  sucursales_ids uuid[] NOT NULL DEFAULT '{}',
  puestos_ids uuid[] NOT NULL DEFAULT '{}',
  opciones jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.autogestion_secciones TO authenticated;
GRANT ALL ON public.autogestion_secciones TO service_role;
ALTER TABLE public.autogestion_secciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autog_read" ON public.autogestion_secciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "autog_admin_write" ON public.autogestion_secciones FOR ALL TO authenticated USING (public.is_admin_rrhh()) WITH CHECK (public.is_admin_rrhh());

INSERT INTO public.autogestion_secciones (clave, orden, titulo, descripcion, opciones) VALUES
 ('tareas',1,'Mis Tareas','Tus tareas pendientes','{"permitir_imprimir":true}'),
 ('adelanto',2,'Solicitar Adelanto','Solicita un adelanto de sueldo','{}'),
 ('saldo',3,'Consultar Saldo','Ver saldo de cuenta corriente','{}'),
 ('vacaciones',4,'Solicitar Vacaciones','Solicitá tus días de vacaciones','{"dias_anticipacion":0}'),
 ('pedidos',5,'Mis pedidos','Ver en qué estado están tus vacaciones y adelantos','{}'),
 ('charla',6,'Hablar con RRHH','Reservá un horario para charlar con Recursos Humanos','{}');

CREATE OR REPLACE FUNCTION public.kiosk_get_autogestion_secciones(p_empleado_id uuid)
RETURNS SETOF public.autogestion_secciones
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.* FROM autogestion_secciones s
  LEFT JOIN empleados e ON e.id = p_empleado_id
  WHERE s.activo
    AND (cardinality(s.sucursales_ids) = 0 OR e.sucursal_id = ANY(s.sucursales_ids))
    AND (cardinality(s.puestos_ids) = 0 OR e.puesto_id = ANY(s.puestos_ids))
  ORDER BY s.orden;
$$;
GRANT EXECUTE ON FUNCTION public.kiosk_get_autogestion_secciones(uuid) TO anon, authenticated;