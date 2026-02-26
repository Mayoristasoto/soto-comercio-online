
INSERT INTO facial_recognition_config (key, value, description, data_type) VALUES
  ('kiosk_alert_llegada_tarde_seconds', '2', 'Duración alerta llegada tarde (seg)', 'number'),
  ('kiosk_alert_cruces_rojas_seconds', '2', 'Duración alerta cruces rojas (seg)', 'number'),
  ('kiosk_alert_pausa_excedida_seconds', '2', 'Duración alerta pausa excedida (seg)', 'number'),
  ('kiosk_alert_novedades_seconds', '5', 'Duración alerta novedades (seg)', 'number'),
  ('kiosk_alert_tareas_seconds', '10', 'Duración alerta tareas pendientes (seg)', 'number'),
  ('kiosk_alert_cruces_rojas_enabled', 'true', 'Habilitar alerta cruces rojas', 'boolean'),
  ('kiosk_alert_pausa_excedida_enabled', 'true', 'Habilitar alerta pausa excedida', 'boolean'),
  ('kiosk_alert_novedades_enabled', 'true', 'Habilitar alerta novedades', 'boolean'),
  ('kiosk_alert_tareas_enabled', 'true', 'Habilitar alerta tareas pendientes', 'boolean'),
  ('kiosk_alert_order', '["llegada_tarde","cruces_rojas","pausa_excedida","novedades","tareas_pendientes"]', 'Orden de alertas del kiosco', 'json')
ON CONFLICT (key) DO NOTHING;
