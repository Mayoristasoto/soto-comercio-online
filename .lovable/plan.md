# Reglamento interno firmado, avisos de incidencias al empleado y alertas por WhatsApp (apagadas)

Orden: primero el reglamento, después lo que ve el empleado y por último WhatsApp.

## 1. Que todos firmen el Reglamento Interno (primero)
- Cargar el "Reglamento Interno" como documento obligatorio y asignarlo a **todos los empleados activos**. Tiene que incluir la escala de exigencia: 2da falta del mes = aviso, 3ra = llamado de atención, 5ta = apercibimiento.
- Al entrar a la app, cada empleado ve la pantalla de firma, que no se puede cerrar hasta firmar. Esa pantalla ya existe.
- En el kiosco, al fichar, mostrar un aviso "Tenés el Reglamento Interno sin firmar" hasta que lo firme. Solo avisa: no bloquea el fichaje.
- Panel para RRHH: cuántos firmaron y cuántos faltan, filtro por sucursal y lista de pendientes para reclamarles la firma.
- Necesito que me pases el texto o el PDF del reglamento. Si no lo tenés, armo un borrador para que lo revises.

## 2. Que el empleado sepa cómo viene con sus incidencias
- **Pantalla "Mi puntualidad" en el kiosco (autogestión) y en su panel:** llegadas tarde y descansos de más del mes, con fecha y minutos. También muestra sus cruces rojas y en qué paso de la escala está ("Te falta 1 para un llamado de atención").
- **Aviso al fichar, más claro:** hoy ya se muestra un contador. Pasa a tener color según el riesgo (verde 0-1, amarillo 2, naranja 3-4, rojo 5+) y una frase de qué pasa con la próxima falta.
- **Aviso en el momento:** si llega tarde, el kiosco le dice "Llegaste X min tarde, es tu falta N del mes". Lo mismo al volver de un descanso largo.
- **Llamados de atención en su legajo:** el empleado los ve y confirma que los leyó, así queda registrado que se enteró.
- **Resumen semanal:** el lunes, al fichar, ve cómo le fue la semana anterior.

## 3. Avisos por WhatsApp listos pero apagados
- Dejar preparados estos avisos, cada uno con su interruptor, **todos apagados**:
  - Llegada tarde / descanso de más (al empleado)
  - Escala alcanzada: 2da, 3ra o 5ta falta (al empleado y al encargado)
  - No fichó la salida
  - Reglamento sin firmar (recordatorio)
  - Vacaciones aprobadas o rechazadas, recibo de sueldo disponible
- Botón general "WhatsApp activo: NO" en la página WhatsApp. Mientras esté apagado no sale nada, pero cada aviso queda en el registro como "no enviado (desactivado)", así podés ver qué se hubiera mandado.
- Un texto editable para cada aviso, con vista previa.

## Detalle técnico
- Reglamento: fila en `documentos_obligatorios` y asignación masiva en `asignaciones_documentos_obligatorios` con `debe_firmar_documentos_iniciales = true` para empleados activos; se reutiliza `ForcedDocumentSigning`. Kiosco: RPC SECURITY DEFINER `kiosk_reglamento_pendiente(p_empleado_id)` con GRANT anon.
- Mi puntualidad: RPC `mi_puntualidad_mes(p_empleado_id)` sobre `fichajes_tardios`, `fichajes_pausas_excedidas` y `empleado_cruces_rojas` (anuladas excluidas), y extender `kiosk_contador_exigencia`. Confirmación de lectura en `empleados_anotaciones` (campo de leído) o en `confirmaciones_lectura`.
- WhatsApp: claves en `fichado_configuracion` (`whatsapp_global_activo=false`, `wa_aviso_<tipo>_activo=false`, `wa_plantilla_<tipo>`); `enviarWhatsApp` registra con estado `desactivado` sin llamar a Whaticket; los avisos se disparan desde `aplicar_escala_exigencia` y desde los triggers de tardanza y pausa, a través de una cola que procesa una función.
