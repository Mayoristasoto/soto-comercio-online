-- Agregar configuraciones de audio para tareas pendientes si no existen
INSERT INTO fichado_configuracion (clave, valor, descripcion, tipo)
VALUES 
  ('mensaje_audio_tareas_pendientes', 'Tienes {cantidad} tareas pendientes para hoy. Recuerda revisarlas.', 'Mensaje de audio cuando hay tareas pendientes (usar {cantidad} para el número)', 'string'),
  ('audio_tareas_pendientes_activo', 'true', 'Activar/desactivar mensaje de audio para tareas pendientes', 'boolean')
ON CONFLICT (clave) DO NOTHING;