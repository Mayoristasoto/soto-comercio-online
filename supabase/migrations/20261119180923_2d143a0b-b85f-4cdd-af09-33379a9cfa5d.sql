CREATE OR REPLACE FUNCTION public.encargado_empleados_visibles(_gerente uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT x.id FROM (
    SELECT e.id FROM public.encargado_equipo q JOIN public.empleados e ON e.id = q.empleado_id
     WHERE q.gerente_id = _gerente AND e.activo
    UNION
    SELECT e.id FROM public.empleados e, public.empleados g
     WHERE g.id = _gerente AND e.activo AND g.sucursal_id IS NOT NULL AND e.sucursal_id = g.sucursal_id
       AND NOT EXISTS (SELECT 1 FROM public.encargado_equipo q2 WHERE q2.gerente_id = _gerente)
  ) x
  -- Solo responde por uno mismo o, si es RRHH, por cualquier encargado.
  WHERE _gerente = public.current_empleado_id() OR public.h2_es_rrhh()
$$;
CREATE INDEX IF NOT EXISTS encargado_equipo_empleado_idx ON public.encargado_equipo (empleado_id);