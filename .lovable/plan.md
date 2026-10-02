# Integración WhatsApp con Whaticket

## Lo que hay hoy
- Tres envíos automáticos usan una dirección vieja (`api.mayoristasoto.online/api/messages/send`): avisos de salida no fichada, cumpleaños/aniversarios y encuestas a clientes.
- Las invitaciones a entrevistas abren WhatsApp a mano (link wa.me), sin envío automático.
- No hay registro de qué se mandó ni si falló.

## Lo que hay que cambiar
1. **Un único "enviador" central** que hable con Whaticket (`POST /api/v1/messages` con `connectionId` + lista de mensajes con `number`, `name`, `body`). Todos los envíos pasan por ahí.
2. **Pasar los 3 envíos actuales** (salidas, cumpleaños, encuestas) al enviador nuevo.
3. **Invitaciones de entrevistas**: botón "Enviar por WhatsApp" que manda el link de reserva directo al candidato.
4. **Avisos a empleados**: vacaciones aprobadas/rechazadas, recibo disponible, llamado de atención (exigencia).
5. **Registro de envíos**: pantalla con fecha, destinatario, mensaje, origen (encuesta, entrevista, aviso) y estado (enviado / falló + motivo). Botón reintentar.
6. **Pantalla de configuración** (solo RRHH): elegir la conexión de WhatsApp (se listan con `GET /whatsapps`), botón "Probar conexión" (`GET /me`), envío de prueba, y prender/apagar cada tipo de aviso.
7. **Números**: normalizar a formato 549XXXXXXXXXX antes de enviar.

## Qué necesito de vos
- Un **token** creado en Whaticket (página Tokens) con permisos `campaigns:create`, `campaigns:start` y `contacts:view`. Lo guardo en forma segura.
- La **dirección de tu Whaticket** (ej. `https://tuempresa.whaticket.com`).

## Detalle técnico
- Edge function `whaticket-send` (service role): recibe `{origen, destinos[{numero,nombre,texto}]}`, llama a Whaticket con Bearer `WHATICKET_TOKEN`, URL base `WHATICKET_BASE_URL`, `connectionId` desde `fichado_configuracion` (`whaticket_connection_id`).
- Tabla `whatsapp_envios` (id, origen, referencia_id, numero, nombre, mensaje, estado, error, respuesta jsonb, created_at, enviado_por) con GRANT + RLS solo admin_rrhh.
- Refactor de `whatsapp-notify`, `birthday-anniversary-notify`, `encuesta-whatsapp` para usar el helper compartido.
- Respuestas de clientes/tickets (`/tickets`) quedan fuera de este MVP.
