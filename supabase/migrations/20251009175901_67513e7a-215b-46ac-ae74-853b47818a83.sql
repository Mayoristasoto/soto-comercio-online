-- Actualizar el mensaje de audio por defecto para incluir el placeholder del nombre
UPDATE fichado_configuracion 
SET valor = '¡Bienvenido {nombre}! Tu fichaje ha sido registrado correctamente.'
WHERE clave = 'mensaje_audio_checkin';

-- Si no existe, insertarlo
INSERT INTO fichado_configuracion (clave, valor, tipo, descripcion)
VALUES (
  'mensaje_audio_checkin',
  '¡Bienvenido {nombre}! Tu fichaje ha sido registrado correctamente.',
  'string',
  'Mensaje de audio que se reproduce después del primer check-in. Use {nombre} para incluir el nombre del empleado.'
)
ON CONFLICT (clave) DO UPDATE
SET valor = EXCLUDED.valor,
    descripcion = EXCLUDED.descripcion;