-- Actualizar fechas de desafíos activos al periodo actual
-- Semanal: lunes a domingo de la semana actual
UPDATE public.desafios
SET 
  fecha_inicio = date_trunc('week', now())::date,
  fecha_fin = (date_trunc('week', now()) + interval '6 days')::date,
  updated_at = now()
WHERE estado = 'activo' AND tipo_periodo = 'semanal';

-- Mensual: primer y último día del mes actual
UPDATE public.desafios
SET 
  fecha_inicio = date_trunc('month', now())::date,
  fecha_fin = (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date,
  updated_at = now()
WHERE estado = 'activo' AND tipo_periodo = 'mensual';

-- Semestral: semestre actual
WITH params AS (
  SELECT 
    CASE WHEN EXTRACT(MONTH FROM now()) <= 6
      THEN make_date(EXTRACT(YEAR FROM now())::int, 1, 1)
      ELSE make_date(EXTRACT(YEAR FROM now())::int, 7, 1)
    END AS start_sem,
    CASE WHEN EXTRACT(MONTH FROM now()) <= 6
      THEN make_date(EXTRACT(YEAR FROM now())::int, 6, 30)
      ELSE make_date(EXTRACT(YEAR FROM now())::int, 12, 31)
    END AS end_sem
)
UPDATE public.desafios d
SET 
  fecha_inicio = p.start_sem,
  fecha_fin = p.end_sem,
  updated_at = now()
FROM params p
WHERE d.estado = 'activo' AND d.tipo_periodo = 'semestral';