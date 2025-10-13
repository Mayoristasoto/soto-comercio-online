-- Agregar configuración para notificaciones de cumpleaños y aniversarios
INSERT INTO fichado_configuracion (clave, valor, descripcion, tipo) VALUES
('whatsapp_cumpleanos_activo', 'false', 'Activar notificaciones de cumpleaños por WhatsApp', 'boolean'),
('whatsapp_aniversario_activo', 'false', 'Activar notificaciones de aniversarios laborales por WhatsApp', 'boolean'),
('whatsapp_notificaciones_numero', '595985523065', 'Número de WhatsApp donde se envían las notificaciones', 'string'),
('mensaje_cumpleanos', 'Hoy {nombre} {apellido} cumple {edad} años. ¡Feliz cumpleaños! 🎂🎉', 'Mensaje para cumpleaños de empleados', 'string'),
('mensaje_aniversario', 'Hoy {nombre} {apellido} cumple {años} años trabajando con nosotros. ¡Felicidades por su aniversario laboral! 🎊', 'Mensaje para aniversarios laborales', 'string')
ON CONFLICT (clave) DO NOTHING;