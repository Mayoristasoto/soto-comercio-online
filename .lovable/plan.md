
# Plan: Planilla de Turnos de Descanso

## Alcance
- Solo aplica a Sucursal **José Martí** (otras sucursales siguen funcionando como hoy).
- Planilla **semanal**: una asignación vale lunes a domingo.
- Cargada manualmente desde una **pantalla admin** (más adelante migrará al dashboard del encargado).
- Al fichar la pausa **fuera del horario asignado** o **sin turno asignado** → se permite pero genera **alerta/infracción** para RRHH.

## 1. Base de datos

Nueva tabla `planilla_descansos_turnos` (catálogo de los 7 turnos fijos por sucursal):
- `sucursal_id`, `numero_turno` (1–7), `hora_desde`, `hora_hasta`, `permite_gerente` (bool, turno 7 = false).

Nueva tabla `planilla_descansos_asignaciones` (asignación semanal):
- `empleado_id`, `sucursal_id`, `numero_turno`, `semana_inicio` (lunes), `semana_fin` (domingo), `activo`.
- Unique: un empleado por (sucursal, semana). Un turno por (sucursal, numero_turno, semana).

Seed inicial: cargar los 7 turnos de José Martí (10:50–15:30 según planilla).

Nuevos tipos de alerta en `novedades_alertas` / infracciones:
- `descanso_fuera_de_turno`
- `descanso_sin_turno_asignado`

## 2. Pantalla admin de carga
Ruta: `/rrhh/planilla-descansos`

- Selector de semana (lunes-domingo) con navegación ‹ ›.
- Selector de sucursal (por ahora solo José Martí habilitada).
- Tabla con los 7 turnos y, en cada fila, un combo para elegir empleado de esa sucursal.
- Turno 7 (14:50–15:30): filtra y bloquea gerentes.
- Validación: un empleado no puede estar en dos turnos la misma semana.
- Botón "Copiar de semana anterior".
- Guardado en `planilla_descansos_asignaciones`.

## 3. Validación al fichar pausa (kiosco)
En el flujo actual de inicio de pausa, si la sucursal del empleado es José Martí:

1. Buscar asignación vigente del empleado para la semana actual.
2. Casos:
   - **Sin asignación** → permite la pausa + crea alerta `descanso_sin_turno_asignado`.
   - **Con asignación pero fuera de franja** (con tolerancia configurable, default 0 min) → permite + alerta `descanso_fuera_de_turno` indicando turno esperado vs hora real.
   - **Dentro de franja** → flujo normal, sin alerta.
3. La alerta aparece en el panel de novedades de RRHH y queda registrada.

## 4. Visualización para el empleado (mínimo)
En el kiosco, al iniciar sesión y antes de fichar pausa, mostrar un cartel pequeño: "Tu turno de descanso esta semana: Turno X — 12:10 a 12:50" si tiene asignación.

## Detalles técnicos
- Edge function / RPC `validar_horario_descanso(empleado_id, timestamp)` con SECURITY DEFINER usada por el flujo anónimo del kiosco (sigue convención de `mem://security/kiosk/acceso-datos-rpc-mechanisms`).
- Generación de alertas vía RPC para permitir flujo anónimo (igual que `mem://features/kiosk/alertas-pausa-sesion-anonima`).
- Semana calculada en TZ Argentina (UTC-3) usando `src/lib/dateUtils.ts`.
- Grants estándar a `authenticated` y `service_role`; RLS por sucursal/rol RRHH.

## Fuera de alcance (futuro)
- Dashboard del encargado para cargar la planilla por sí mismo.
- Replicar a otras sucursales.
- Reportes históricos de cumplimiento de turnos.
