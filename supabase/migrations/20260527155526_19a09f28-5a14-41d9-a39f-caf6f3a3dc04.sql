
-- 1) Catálogo de items
CREATE TABLE public.entregas_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entregas_items TO authenticated;
GRANT ALL ON public.entregas_items TO service_role;

ALTER TABLE public.entregas_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_rrhh manage entregas_items"
ON public.entregas_items
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin_rrhh'))
WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));

CREATE POLICY "staff view entregas_items"
ON public.entregas_items
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_rrhh')
  OR public.has_role(auth.uid(), 'gerente_sucursal')
);

CREATE TRIGGER trg_entregas_items_updated_at
BEFORE UPDATE ON public.entregas_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Registros por empleado e item
CREATE TABLE public.entregas_empleado (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.entregas_items(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','entregado','no_aplica')),
  fecha_entrega TIMESTAMPTZ,
  registrado_por UUID REFERENCES public.empleados(id) ON DELETE SET NULL,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empleado_id, item_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entregas_empleado TO authenticated;
GRANT ALL ON public.entregas_empleado TO service_role;

ALTER TABLE public.entregas_empleado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_rrhh manage entregas_empleado"
ON public.entregas_empleado
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin_rrhh'))
WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));

CREATE POLICY "gerente view entregas_empleado sucursal"
ON public.entregas_empleado
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'gerente_sucursal')
  AND EXISTS (
    SELECT 1
    FROM public.empleados emp_target
    JOIN public.empleados emp_gerente ON emp_gerente.user_id = auth.uid()
    WHERE emp_target.id = entregas_empleado.empleado_id
      AND emp_target.sucursal_id = emp_gerente.sucursal_id
  )
);

CREATE INDEX idx_entregas_empleado_empleado ON public.entregas_empleado(empleado_id);
CREATE INDEX idx_entregas_empleado_item ON public.entregas_empleado(item_id);

CREATE TRIGGER trg_entregas_empleado_updated_at
BEFORE UPDATE ON public.entregas_empleado
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Seed inicial de items
INSERT INTO public.entregas_items (nombre, descripcion, orden) VALUES
  ('Faja', 'Faja lumbar de trabajo', 1),
  ('Zapatos', 'Calzado de seguridad', 2),
  ('Uniforme', 'Remera/camisa de trabajo', 3),
  ('Gorra', 'Gorra reglamentaria', 4),
  ('Casillero', 'Asignación de casillero', 5);
