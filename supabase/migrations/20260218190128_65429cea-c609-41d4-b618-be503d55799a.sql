-- Cancelar tareas vencidas de la semana pasada
UPDATE tareas SET estado = 'cancelada' 
WHERE id IN ('01b08ae6-37d7-4316-a57d-ee97bafac9c9', '97df0b23-c7a0-4895-a06f-493babf12d8a');