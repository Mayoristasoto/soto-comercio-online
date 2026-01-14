-- Agregar configuraciones para impresión automática y alerta de llegada tarde
INSERT INTO facial_recognition_config (key, value, data_type, description)
VALUES 
  ('auto_print_tasks_enabled', 'false', 'boolean', 'Habilita o deshabilita la impresión automática de tareas al fichar entrada'),
  ('late_arrival_alert_enabled', 'false', 'boolean', 'Habilita o deshabilita la alerta de llegada tarde en el kiosco')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();