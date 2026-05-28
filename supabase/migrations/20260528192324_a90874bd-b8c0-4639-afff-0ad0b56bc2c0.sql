-- 1) Crear turno personal para Jonathan Vera con override de martes y jueves
INSERT INTO public.fichado_turnos (
  nombre, tipo, hora_entrada, hora_salida,
  hora_pausa_inicio, hora_pausa_fin, duracion_pausa_minutos,
  tolerancia_entrada_minutos, tolerancia_salida_minutos, redondeo_minutos,
  permite_extras, sucursal_id, activo, dias_semana, horarios_por_dia
)
SELECT
  'Mañana Marti - J. Vera', tipo, hora_entrada, hora_salida,
  hora_pausa_inicio, hora_pausa_fin, duracion_pausa_minutos,
  tolerancia_entrada_minutos, tolerancia_salida_minutos, redondeo_minutos,
  permite_extras, sucursal_id, true,
  ARRAY[1,2,3,4,5,6]::int[],
  '{"2":{"hora_entrada":"10:30","hora_salida":"18:30"},"4":{"hora_entrada":"10:30","hora_salida":"18:30"}}'::jsonb
FROM public.fichado_turnos
WHERE id = '504177ae-e519-4c97-b686-329c0fb96c8d';

-- 2) Reapuntar la asignación activa de Jonathan al nuevo turno
UPDATE public.empleado_turnos
SET turno_id = (
  SELECT id FROM public.fichado_turnos
  WHERE nombre = 'Mañana Marti - J. Vera'
  ORDER BY created_at DESC LIMIT 1
),
updated_at = now()
WHERE id = '6e1e80f3-5791-4826-a6d6-9a91e0718634';