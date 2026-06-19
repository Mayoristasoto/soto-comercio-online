# Alerta de inicio de descanso fuera de franja programada (Kiosco)

## Estado actual

- Ya existe la infraestructura backend: la RPC `kiosk_validar_descanso_turno(empleado_id, fichaje_id)` se invoca en `KioscoCheckIn.tsx` (líneas 806–827) tras un `pausa_inicio` y, cuando el empleado ficha fuera del turno asignado en `planilla_descansos_asignaciones` / `planilla_descansos_turnos`, ya:
  - Inserta una incidencia en `fichaje_incidencias` (`descanso_fuera_turno` o `descanso_sin_turno`).
  - Devuelve `{ ok: false, motivo, turno, desde, hasta, descripcion }`.
- Hoy esa respuesta solo muestra un `toast` rojo de 6s, igual que un error normal — el empleado puede no verlo y RRHH lo recibe sin contexto visual fuerte.

## Objetivo

Mostrar en el kiosco una **alerta modal bloqueante** equivalente a `PausaExcedidaAlert` / `LlegadaTardeAlert` cuando el empleado inicia un descanso fuera de su franja programada, de modo que:
1. El empleado vea claramente que su descanso quedó fuera del turno asignado.
2. Se muestre la franja correcta y la hora real registrada.
3. RRHH siga recibiendo la incidencia (no se cambia el backend).

## Cambios

### 1. Nuevo componente `src/components/kiosko/DescansoFueraFranjaAlert.tsx`

Modal estilo shadcn `AlertDialog` (mismo patrón que `PausaExcedidaAlert.tsx`):
- Props: `open`, `onClose`, `motivo: 'fuera_turno' | 'sin_turno'`, `numeroTurno?`, `horaDesde?`, `horaHasta?`, `horaReal`, `descripcion`.
- Contenido:
  - Título: "⚠️ Descanso fuera de franja" / "⚠️ Sin turno de descanso asignado".
  - Cuerpo: hora real del fichaje, franja asignada (`HH:MM a HH:MM`), número de turno y aviso de que se notificó a RRHH.
  - Botón "Entendido" que cierra el modal.
- Tokens de color desde el design system (destructivo), sin colores hardcodeados.

### 2. Integración en `src/pages/KioscoCheckIn.tsx`

- Agregar estado `descansoFranjaInfo: { motivo, numeroTurno?, horaDesde?, horaHasta?, horaReal, descripcion } | null`.
- En el bloque actual (líneas 806–827) reemplazar el `toast` por `setDescansoFranjaInfo({...})` cuando `v.ok === false`. Mantener el `toast` solo como fallback si la RPC falla.
- Renderizar `<DescansoFueraFranjaAlert>` junto a las demás alertas del kiosco, encolado de manera consistente con el flujo actual de alertas post-fichaje.
- Asegurar que cerrar la alerta no rompe la secuencia (foto, novedades, tareas, etc.): se cierra antes de continuar el flujo, igual que `PausaExcedidaAlert`.

### 3. Sin cambios de base de datos

No se modifican `kiosk_validar_descanso_turno`, `planilla_descansos_*` ni `fichaje_incidencias`. La incidencia ya se registra correctamente.

## Detalles técnicos

- Hora real: usar la `hora_propuesta` que devuelve la RPC (formato `HH:MM`) o derivar localmente con `format(new Date(), 'HH:mm', { timeZone: 'America/Argentina/Buenos_Aires' })` vía `dateUtils`.
- El modal solo aparece para `pausa_inicio`; el resto de tipos de fichaje no son afectados.
- Reutilizar variantes de `AlertDialog` para conservar consistencia con `PausaExcedidaAlert`.

## Validación

- Probar empleado con asignación vigente fichando dentro de franja → no aparece alerta.
- Empleado fichando fuera de franja → aparece modal con turno y horario.
- Empleado sin asignación de turno esa semana → aparece modal con motivo "sin_turno".
- Verificar en `fichaje_incidencias` que se sigue insertando la fila pendiente.
