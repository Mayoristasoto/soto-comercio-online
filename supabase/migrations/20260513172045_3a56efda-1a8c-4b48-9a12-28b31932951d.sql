
-- Helper SECURITY DEFINER to break recursion between calendarios and calendario_compartidos
CREATE OR REPLACE FUNCTION public.is_calendario_compartido_con_actual(_calendario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendario_compartidos sc
    WHERE sc.calendario_id = _calendario_id
      AND sc.empleado_id = public.current_empleado_id()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_owner_calendario(_calendario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendarios c
    WHERE c.id = _calendario_id
      AND c.owner_id = public.current_empleado_id()
  )
$$;

DROP POLICY IF EXISTS "ver calendarios visibles" ON public.calendarios;
CREATE POLICY "ver calendarios visibles"
ON public.calendarios
FOR SELECT
USING (
  activo = true AND (
    es_publico = true
    OR owner_id = public.current_empleado_id()
    OR public.is_calendario_compartido_con_actual(id)
  )
);

DROP POLICY IF EXISTS "ver compartidos relacionados" ON public.calendario_compartidos;
CREATE POLICY "ver compartidos relacionados"
ON public.calendario_compartidos
FOR SELECT
USING (
  empleado_id = public.current_empleado_id()
  OR public.is_owner_calendario(calendario_id)
);

DROP POLICY IF EXISTS "owner gestiona compartidos" ON public.calendario_compartidos;
CREATE POLICY "owner gestiona compartidos"
ON public.calendario_compartidos
FOR ALL
USING (public.is_owner_calendario(calendario_id))
WITH CHECK (public.is_owner_calendario(calendario_id));
