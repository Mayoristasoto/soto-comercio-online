
-- Agregar configuración para deshabilitar notificaciones de cruces rojas en kiosco
INSERT INTO fichado_configuracion (clave, valor, tipo, descripcion)
VALUES (
  'kiosko_mostrar_cruces_rojas',
  'false',
  'boolean',
  'Mostrar alerta de cruces rojas en el kiosco al hacer check-in'
)
ON CONFLICT (clave) DO NOTHING;
