
INSERT INTO public.categorias_justificacion_asistencia (nombre, color, es_justificada, activa, orden)
SELECT v.nombre, v.color, v.es_justificada, true, v.orden
FROM (VALUES
  ('Vacaciones', '#16a34a', true, 100),
  ('Licencia médica', '#0ea5e9', true, 101),
  ('Día médico', '#38bdf8', true, 102),
  ('Turno médico', '#60a5fa', true, 103),
  ('Trámite personal autorizado', '#a855f7', true, 104),
  ('Evento de empresa', '#f59e0b', true, 105),
  ('Capacitación', '#8b5cf6', true, 106),
  ('Franco compensatorio', '#14b8a6', true, 107),
  ('Día de estudio / examen', '#6366f1', true, 108),
  ('Maternidad / Paternidad', '#ec4899', true, 109),
  ('Fallecimiento familiar', '#64748b', true, 110),
  ('Matrimonio', '#f472b6', true, 111),
  ('ART / Accidente laboral', '#dc2626', true, 112),
  ('Licencia sin goce', '#94a3b8', true, 113),
  ('Cambio de turno no actualizado', '#95198d', true, 114),
  ('Falla técnica de fichaje', '#4b0d6d', true, 115),
  ('Justificada (otro)', '#6b7280', true, 116),
  ('Sin justificar', '#ef4444', false, 117)
) AS v(nombre, color, es_justificada, orden)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categorias_justificacion_asistencia c
  WHERE lower(c.nombre) = lower(v.nombre)
);
