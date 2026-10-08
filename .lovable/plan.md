# Plan: linkear tarjetas de Autogestión con funciones existentes

## Objetivo
Que las 3 tarjetas nuevas del kiosco (Solicitar elementos, Mis métricas, Cambio de horario) no vivan aisladas: que usen las mismas pantallas, catálogos y flujos de aprobación que ya existen en el sistema.

## 1. Solicitar elementos → módulo de Entregas existente
- **Catálogo**: hoy la tarjeta lista elementos desde `entregas_items`. Verificar que sea el mismo catálogo que usa la matriz de entregas (RRHH → Entregas) y, si falta algo, que se cargue ahí una sola vez.
- **Aprobación**: la solicitud cae en Solicitudes generales (ya funciona). Al aprobarla, el trigger ya crea la entrega pendiente en la matriz de entregas con firma pendiente. Falta probar el circuito completo: pedido en kiosco → aprobación RRHH → aparece en matriz → firma del empleado.
- **Visibilidad del empleado**: en "Mis pedidos" mostrar el estado de la entrega (pendiente de firma / entregado) linkeando a `entregas_empleado`.

## 2. Mis métricas del mes → misma fuente que Informe de puntualidad
- Hoy la tarjeta calcula con su propio RPC (`kiosk_mis_metricas`). Unificar criterios con el informe de RRHH (`/rrhh/informe-puntualidad`): misma tolerancia, mismos filtros de domingos/feriados y misma escala mensual, para que el número que ve el empleado sea el mismo que ves vos.
- Agregar en la tarjeta un texto "estos números son los mismos que ve RRHH en tu informe".

## 3. Cambio de horario → módulo Cambios de horario existente
- La aprobación del gerente ya escribe en `cambios_horario` (la misma tabla que usa RRHH). Falta:
  - Que el cambio pedido desde el kiosco **aparezca en la pantalla de Cambios de horario de RRHH** con origen "kiosco" y motivo, para tener trazabilidad en un solo lugar.
  - Que el gerente lo vea también en su panel de solicitudes con el detalle (día, horario nuevo, motivo).
  - Notificación a RRHH ya existe; agregar aviso al empleado cuando se aprueba o rechaza.

## 4. Configuración desde un solo lugar
- Las tarjetas nuevas ya se ordenan/ocultan en Configuración → Autogestión. Agregar ahí los parámetros que hoy están sueltos: días de anticipación del cambio de horario y quién aprueba (gerente sucursal, fijo por ahora).

## 5. Pruebas (con tu acceso de prueba de la llavecita)
- Pedido de elemento → aprobar → verificar matriz de entregas.
- Cambio de horario → aprobar como gerente → verificar que el kiosco no marca tarde ese día y que figura en Cambios de horario.
- Métricas: comparar números del kiosco contra el informe de puntualidad del mismo empleado.

## Qué NO incluye
- Banco de horas (sigue apagado, falta definir reglas).
- WhatsApp (sigue apagado).
