# Autogestión: elementos, mis métricas, cambio de horario y banco de horas

## Qué existe hoy
- **Entregas de elementos:** RRHH carga lo que entrega (uniforme, talle, cantidad) y el empleado lo confirma. El empleado no puede pedir nada.
- **Métricas del mes:** "Mi puntualidad" ya calcula, para cada empleado, las llegadas tarde y los excesos de descanso del mes, pero está apagado y no aparece en el kiosco.
- **Cambios de horario:** hoy los carga el encargado o RRHH. El empleado no puede pedirlos.
- **Aprobación en dos pasos:** las solicitudes generales ya tienen etapas (gerente y RRHH) y se pueden reutilizar.
- **Banco de horas:** no existe. Hoy solo se calcula el balance diario y mensual de horas trabajadas.

## Fase 1 — en el kiosco (Autogestión), como tarjetas nuevas configurables
1. **Solicitar elementos**
   - El empleado elige el elemento de la lista de entregas (remera, pantalón, calzado…), el talle, la cantidad y el motivo (rotura, talle o reposición).
   - RRHH aprueba o rechaza. Al aprobar, se crea la entrega pendiente de firma en la matriz de entregas que ya existe.
2. **Mis métricas del mes**
   - Muestra llegadas tarde (cantidad y minutos), excesos de descanso, días trabajados, horas del mes y en qué paso de la escala está (2.ª, 3.ª o 5.ª).
   - Incluye el detalle día por día y permite ver el mes anterior.
3. **Solicitar cambio de horario**
   - El empleado elige el día, el nuevo horario de entrada y salida, el motivo (turno médico, trámite, personal u otro) y puede adjuntar una foto del comprobante.
   - Lo aprueba el **gerente de la sucursal**. Al aprobarse, **RRHH recibe un aviso** en la campanita y el cambio se aplica en la tabla de cambios de horario. Así ese día no le marca llegada tarde.
   - Si el gerente lo rechaza, el empleado lo ve en "Mis pedidos".
4. Todo aparece en **"Mis pedidos"** con su estado.

## Fase 2 — Banco de horas (para revisar antes de activar)
- Cada empleado tiene un saldo de horas que puede ser positivo o negativo.
  - **Suma** cuando trabaja de más (ej.: se queda 1 h extra) o cuando devuelve horas.
  - **Resta** cuando entra más tarde o se va antes con un cambio aprobado de tipo "a compensar".
- Al pedir un cambio de horario, el empleado elige si **compensa con el banco** o si lo **justifica** (por ejemplo, con un certificado médico, que no descuenta).
- Reglas configurables: tope negativo (ej.: -8 h), tope positivo, plazo para compensar (ej.: 30 días) y qué hacer al cierre del mes (pasar a horas extras o descontar).
- El empleado ve su saldo en el kiosco y RRHH ve el saldo de todos, con historial de movimientos y ajustes manuales.
- Queda **apagado** hasta que definas las reglas.

## Detalles técnicos
- Elementos: tipo `elemento` en `solicitudes_generales`. En `descripcion`/jsonb se guardan el item, el talle y la cantidad. Al aprobar, un RPC inserta en `entregas_elementos`.
- Métricas: se reutiliza `mi_puntualidad_mes` desde el kiosco con un RPC kiosk SECURITY DEFINER filtrado por `empleado_id`.
- Cambio de horario: tipo `cambio_horario` en `solicitudes_generales`, con `etapa` gerente → aprobada. `gerente_resolver_solicitud` inserta en `cambios_horario` y crea una notificación para admin_rrhh.
- Banco de horas: tabla `banco_horas_movimientos` (empleado, fecha, minutos ±, origen, solicitud_id, creado_por) más la configuración en `fichado_configuracion`, con RLS y GRANTs.
- Las tarjetas nuevas se agregan como secciones estándar en `autogestion_secciones`.
