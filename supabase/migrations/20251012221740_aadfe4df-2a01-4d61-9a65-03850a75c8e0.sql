-- Agregar configuración para activar/desactivar mensaje de bienvenida
INSERT INTO fichado_configuracion (clave, valor, descripcion, tipo)
VALUES 
  ('audio_checkin_activo', 'true', 'Activar/desactivar mensaje de audio de bienvenida', 'boolean')
ON CONFLICT (clave) DO NOTHING;