
-- Borrar 3 solicitudes duplicadas creadas por la importación masiva del 2026-06-04
-- que solapan con solicitudes preexistentes del mismo empleado.
DELETE FROM public.solicitudes_vacaciones
WHERE id IN (
  '0a34b612-bdb7-40b1-93af-866c6bc5af12', -- Laura Lorena Lan (gozadas duplicada de aprobada 11-17/05)
  '6c16d416-9447-4b14-a067-bc1a65a1e6f3', -- Gonzalo Justiniano (gozadas duplicada exacta 2-8/03)
  'd87d9cec-d59e-4323-8ab3-364b434647d2'  -- Tomás Javier Diaz (solapa con 25/05-07/06)
);

-- Índice único parcial: impide duplicados exactos (mismo empleado + mismas fechas) en estados activos
CREATE UNIQUE INDEX IF NOT EXISTS solicitudes_vacaciones_no_dup
ON public.solicitudes_vacaciones (empleado_id, fecha_inicio, fecha_fin)
WHERE estado IN ('pendiente','aprobada','gozadas');
