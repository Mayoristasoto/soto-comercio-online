INSERT INTO public.grupos_empleados
  (nombre, descripcion, tipo, empleado_ids, filtros, compartido, modulos_sugeridos, color, created_by)
SELECT
  l.nombre,
  'Importado desde listas de liquidación',
  'manual',
  COALESCE(l.empleado_ids, ARRAY[]::uuid[]),
  '{}'::jsonb,
  true,
  ARRAY['nomina']::text[],
  '#4b0d6d',
  l.created_by
FROM public.liquidacion_listas_empleados l
WHERE NOT EXISTS (
  SELECT 1 FROM public.grupos_empleados g
  WHERE g.nombre = l.nombre
    AND COALESCE(g.created_by::text,'') = COALESCE(l.created_by::text,'')
);