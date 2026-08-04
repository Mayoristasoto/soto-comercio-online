CREATE TABLE public.insumos_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  categoria text NOT NULL DEFAULT 'cotidiano',
  unidad text,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.insumos_catalogo TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.insumos_catalogo TO authenticated;
GRANT ALL ON public.insumos_catalogo TO service_role;
ALTER TABLE public.insumos_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insumos_catalogo_select" ON public.insumos_catalogo
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "insumos_catalogo_admin_write" ON public.insumos_catalogo
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));

CREATE TABLE public.insumos_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sucursal_id uuid NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES public.insumos_catalogo(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
  cantidad numeric,
  estado text NOT NULL DEFAULT 'ok',
  necesita_reposicion boolean NOT NULL DEFAULT false,
  observaciones text,
  registrado_por uuid REFERENCES public.empleados(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sucursal_id, insumo_id, fecha)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.insumos_control TO authenticated;
GRANT ALL ON public.insumos_control TO service_role;
ALTER TABLE public.insumos_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insumos_control_select" ON public.insumos_control
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "insumos_control_write" ON public.insumos_control
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_rrhh') OR public.has_role(auth.uid(), 'gerente_sucursal'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh') OR public.has_role(auth.uid(), 'gerente_sucursal'));

CREATE TRIGGER insumos_catalogo_updated_at BEFORE UPDATE ON public.insumos_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER insumos_control_updated_at BEFORE UPDATE ON public.insumos_control
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.insumos_catalogo (nombre, categoria, orden) VALUES
  ('Bidón de agua','cotidiano',1),
  ('Vasos de café','cotidiano',2),
  ('Agitadores','cotidiano',3),
  ('Banditas elásticas','cotidiano',4),
  ('Bolsas','cotidiano',5),
  ('Rollo fiscal','cotidiano',6),
  ('Rollo posnet','cotidiano',7),
  ('Hojas A4','cotidiano',8),
  ('Cinta adhesiva confitera','cotidiano',9),
  ('Toallas de papel baños','cotidiano',10),
  ('Papel higiénico baños','cotidiano',11),
  ('Jabón líquido','cotidiano',12),
  ('Alcohol limpieza góndola','cotidiano',13),
  ('Cutters','ocasional',14),
  ('Fibrones','ocasional',15),
  ('Lapiceras','ocasional',16),
  ('Ganchos abrochadoras','ocasional',17),
  ('Escobas','ocasional',18),
  ('Rejillas','ocasional',19),
  ('Trapo de pisos','ocasional',20),
  ('Difusores','ocasional',21);