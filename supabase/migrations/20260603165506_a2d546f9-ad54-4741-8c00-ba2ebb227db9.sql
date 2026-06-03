
CREATE TABLE public.grupos_empleados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  color text DEFAULT '#4b0d6d',
  tipo text NOT NULL DEFAULT 'manual' CHECK (tipo IN ('manual','dinamico')),
  empleado_ids uuid[] DEFAULT '{}',
  filtros jsonb DEFAULT '{}'::jsonb,
  compartido boolean NOT NULL DEFAULT true,
  modulos_sugeridos text[] DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_grupos_empleados_created_by ON public.grupos_empleados(created_by);
CREATE INDEX idx_grupos_empleados_modulos ON public.grupos_empleados USING gin(modulos_sugeridos);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupos_empleados TO authenticated;
GRANT ALL ON public.grupos_empleados TO service_role;

ALTER TABLE public.grupos_empleados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver grupos compartidos o propios"
ON public.grupos_empleados FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_rrhh')
  OR (
    public.has_role(auth.uid(), 'gerente_sucursal')
    AND (compartido = true OR created_by = auth.uid())
  )
);

CREATE POLICY "Admins y gerentes crean grupos"
ON public.grupos_empleados FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin_rrhh')
  OR public.has_role(auth.uid(), 'gerente_sucursal')
);

CREATE POLICY "Admins y dueño actualizan grupos"
ON public.grupos_empleados FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_rrhh')
  OR created_by = auth.uid()
);

CREATE POLICY "Admins y dueño eliminan grupos"
ON public.grupos_empleados FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_rrhh')
  OR created_by = auth.uid()
);

CREATE TRIGGER trg_grupos_empleados_updated_at
BEFORE UPDATE ON public.grupos_empleados
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.resolver_grupo_empleados(_grupo_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g RECORD;
  result uuid[];
  sucursal_ids uuid[];
  puesto_texts text[];
  solo_activos boolean;
BEGIN
  SELECT * INTO g FROM public.grupos_empleados WHERE id = _grupo_id;
  IF NOT FOUND THEN RETURN '{}'::uuid[]; END IF;

  IF g.tipo = 'manual' THEN
    RETURN COALESCE(g.empleado_ids, '{}'::uuid[]);
  END IF;

  sucursal_ids := ARRAY(SELECT jsonb_array_elements_text(COALESCE(g.filtros->'sucursal_ids','[]'::jsonb))::uuid);
  puesto_texts := ARRAY(SELECT jsonb_array_elements_text(COALESCE(g.filtros->'puestos','[]'::jsonb)));
  solo_activos := COALESCE((g.filtros->>'solo_activos')::boolean, true);

  SELECT array_agg(e.id) INTO result
  FROM public.empleados e
  WHERE (NOT solo_activos OR e.activo = true)
    AND (array_length(sucursal_ids,1) IS NULL OR e.sucursal_id = ANY(sucursal_ids))
    AND (array_length(puesto_texts,1) IS NULL OR e.puesto = ANY(puesto_texts));

  RETURN COALESCE(result, '{}'::uuid[]);
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolver_grupo_empleados(uuid) TO authenticated;

INSERT INTO public.grupos_empleados (nombre, tipo, empleado_ids, modulos_sugeridos, created_by, compartido, descripcion)
SELECT 
  nombre,
  'manual',
  empleado_ids,
  ARRAY['nomina']::text[],
  created_by,
  true,
  'Migrada desde listas de liquidación'
FROM public.liquidacion_listas_empleados;
