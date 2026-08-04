# Planificación semanal de encargados con validación de RRHH

Separar el flujo: los encargados tienen su propia sección simple para armar la semana de su sucursal y enviarla a validación; RRHH la revisa y aprueba/rechaza desde su propia bandeja, igual que las vacaciones.

## Situación actual (verificada)

- `planificacion_semanal` ya tiene `estado`, `aprobada_at`, `aprobada_por`, `motivo_rechazo`, `aplicada_at`.
- Las políticas de seguridad actuales solo permiten **leer** a los gerentes: crear/editar está limitado a admin. Hoy un encargado no puede guardar una planificación.
- La vista existente (Fichero > Horarios > Semana) es la de admin: incluye costos, aplicar horarios, exportaciones y toda la operatoria avanzada.
- La página vieja `/rrhh/planificacion-semanal` es un cascarón con banner de redirección.

## Cómo va a funcionar

### Encargado

1. Nueva sección propia: **"Mi planificación semanal"**, accesible desde el panel del encargado (tarjeta ya existente apuntando a la nueva ruta).
2. Elige la semana (lunes a domingo) y arma día por día solo con empleados **de su sucursal**, excluyendo los que están de vacaciones/licencia (mismo criterio ya vigente).
3. Ve horas por empleado y por día, cobertura por hora y total de horas extras **en horas** (sin ningún valor monetario).
4. Estados visibles: `borrador` (puede editar libremente) → **Enviar a validación de RRHH** (`pendiente_aprobacion`).
5. Mientras está pendiente o aprobada, la semana queda en modo lectura para el encargado. Si RRHH la rechaza, ve el motivo y puede volver a editarla y reenviarla.
6. No tiene botón "Aplicar horarios" ni exportes con costos.

### RRHH (admin)

1. Nueva bandeja **"Planificaciones por validar"** dentro de Fichero > Horarios > Semana: lista de semanas con sucursal, encargado, semana, total de horas y horas extras, y estado.
2. Al abrir una, ve la planificación completa (con costos) y puede **Aprobar** o **Rechazar con motivo**.
3. Una vez aprobada, RRHH puede **Aplicar horarios** (ya restringido a admin_rrhh y a estado aprobado).
4. RRHH conserva su vista actual completa sin cambios de funcionalidad.

### Reglas

- Una planificación por sucursal y semana; si el encargado edita una aprobada, vuelve a `pendiente_aprobacion` y se limpia la aprobación.
- El encargado nunca ve valores de hora extra ni costos.
- Solo RRHH aprueba, rechaza y aplica.

## Detalles técnicos

- Migración:
  - Agregar `sucursal_id uuid` a `planificacion_semanal` (referencia a `sucursales`) para separar planificaciones por local, más índice único parcial por (`sucursal_id`, `fecha_inicio_semana`).
  - Políticas nuevas: gerentes pueden `INSERT`/`UPDATE`/`DELETE` en `planificacion_semanal` y `planificacion_semanal_detalle` solo cuando la fila pertenece a su sucursal (`current_user_sucursal_id()`), el creador es su propio empleado y el estado es `borrador` o `rechazada`. Se mantienen las políticas de admin y los grants correspondientes a `authenticated`.
  - Función `SECURITY DEFINER` `enviar_planificacion_a_validacion(planificacion_id)` para pasar a `pendiente_aprobacion` validando pertenencia de sucursal, y `resolver_planificacion(planificacion_id, aprobar boolean, motivo text)` restringida a `is_admin_rrhh()`.
- Frontend:
  - Extraer de `VistaSemanaPlanificacion.tsx` la lógica compartida (armado de días, cobertura, totales) a un hook `usePlanificacionSemana` para reutilizarla sin duplicar código.
  - Nueva página `src/pages/EncargadoPlanificacionSemanal.tsx` (ruta `/encargado/planificacion-semanal`) con la versión reducida, reutilizando `VistaDiaPlanificacion` en modo `soloHoras` y sucursal fija.
  - Nuevo componente `src/components/fichero/BandejaPlanificacionesRRHH.tsx` con la lista por validar y el diálogo de aprobar/rechazar (con motivo), integrado como sub-pestaña de la vista semanal de admin.
  - Actualizar el acceso del panel de encargado en `encargado_dashboard_accesos` para apuntar a la nueva ruta.
  - Fechas siempre en zona Argentina vía `src/lib/dateUtils.ts`; semanas lunes a domingo.
