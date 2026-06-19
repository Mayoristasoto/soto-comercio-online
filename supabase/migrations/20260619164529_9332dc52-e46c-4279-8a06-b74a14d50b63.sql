
INSERT INTO public.facial_recognition_config (key, value, description)
VALUES 
  ('kiosk_alert_descanso_fuera_seconds', '8', 'Duración en segundos de la alerta de descanso fuera de franja'),
  ('kiosk_alert_descanso_fuera_enabled', 'true', 'Habilitar alerta de descanso fuera de franja programada')
ON CONFLICT (key) DO NOTHING;

UPDATE public.facial_recognition_config
SET value = '["llegada_tarde","descanso_fuera_franja","cruces_rojas","pausa_excedida","novedades","tareas_pendientes"]'
WHERE key = 'kiosk_alert_order'
  AND value NOT LIKE '%descanso_fuera_franja%';
