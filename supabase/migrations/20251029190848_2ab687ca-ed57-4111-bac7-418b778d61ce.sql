-- Actualizar todos los turnos activos con descanso de 40 minutos, limpiar horarios de pausa, y poner tolerancia y redondeo en 0
UPDATE fichado_turnos
SET 
  duracion_pausa_minutos = 40,
  hora_pausa_inicio = NULL,
  hora_pausa_fin = NULL,
  tolerancia_entrada_minutos = 0,
  tolerancia_salida_minutos = 0,
  redondeo_minutos = 0,
  updated_at = now()
WHERE activo = true;