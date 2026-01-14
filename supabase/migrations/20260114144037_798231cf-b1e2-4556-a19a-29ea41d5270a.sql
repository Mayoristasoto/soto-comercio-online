-- Actualizar tolerancia de entrada a 1 minuto para todos los turnos
UPDATE fichado_turnos 
SET tolerancia_entrada_minutos = 1,
    updated_at = now()
WHERE tolerancia_entrada_minutos IS DISTINCT FROM 1;