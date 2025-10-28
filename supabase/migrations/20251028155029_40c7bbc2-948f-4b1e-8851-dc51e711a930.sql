-- Insertar el registro del exceso de pausa de Gonzalo Justiniano de hoy
INSERT INTO fichajes_pausas_excedidas (
  empleado_id,
  fecha_fichaje,
  hora_inicio_pausa,
  hora_fin_pausa,
  duracion_minutos,
  duracion_permitida_minutos,
  minutos_exceso,
  turno_id
)
SELECT 
  '96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4'::uuid,
  CURRENT_DATE,
  '14:30:38'::time,
  '15:44:21'::time,
  74,
  40,
  34,
  et.turno_id
FROM empleado_turnos et
WHERE et.empleado_id = '96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4'
  AND et.activo = true
LIMIT 1
ON CONFLICT DO NOTHING;