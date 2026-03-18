
-- Paso 1: Crear turno custom para Merino (14:30-18:30, pausa 20 min)
INSERT INTO public.fichado_turnos (nombre, hora_entrada, hora_salida, duracion_pausa_minutos, tolerancia_entrada_minutos)
VALUES ('Merino Custom', '14:30', '18:30', 20, 1);

-- Paso 2: Actualizar empleado_turnos de Merino al nuevo turno
UPDATE public.empleado_turnos
SET turno_id = (SELECT id FROM public.fichado_turnos WHERE nombre = 'Merino Custom' LIMIT 1),
    updated_at = now()
WHERE empleado_id = 'cc37edfb-c356-4095-afc3-f010b1ba79db'
  AND activo = true;
