# Plan: Ver como completo + Tablero de indicadores + Alertas

Tres mejoras aprobadas por el usuario.

## 1) Terminar "Ver como" en todas las pantallas
- Migrar las pantallas que hoy leen el rol directo de la BD para que usen el hook `useRolEfectivo` (ya creado y usado en Vacaciones y Solicitudes).
- Prioridad: Fichero, Tareas, Anotaciones, Evaluaciones, Nómina, Índice de Ausentismo, Informe Gerencial, Entrevistas, Home y componentes de tareas/fichero/evaluaciones.
- Resultado: al elegir "Ver como Gerente/Líder/Empleado", esas pantallas muestran exactamente lo que ese rol vería (pestañas, botones, acciones).
- Sigue siendo simulación de interfaz: los datos son los que la cuenta de RRHH puede leer.

## 2) Tablero de indicadores (`/rrhh/indicadores`, solo admin_rrhh)
Una pantalla con tarjetas y comparación entre sucursales:
- **Asistencia**: ausentismo del mes, llegadas tarde, pausas excedidas (datos de `fichajes` + RPCs existentes).
- **Horas**: horas trabajadas y horas extras del período.
- **Costos**: costo laboral por sucursal (rentabilidad ya desarrollada).
- **Ventas**: facturación por sucursal (`facturacion_sucursal`) y margen operativo.
- **Personal**: empleados activos, datos incompletos, documentos pendientes.
- Filtro por sucursal y por mes; cada tarjeta enlaza a su detalle.
- Reutiliza funciones y datos existentes; si falta algún dato se muestra "sin datos".

## 3) Alertas y notificaciones automáticas
Centro de avisos para admin_rrhh dentro de la app (sin WhatsApp por ahora):
- Campanita en el encabezado con contador de avisos sin leer.
- Generación automática de avisos:
  - Fichajes faltantes del día anterior (sin entrada registrada).
  - Solicitudes de vacaciones/licencias pendientes de aprobación.
  - Tareas vencidas sin completar.
  - Coberturas de vacaciones enviadas por encargados esperando RRHH.
  - Controles de insumos finalizados por gerentes (ya se registra actividad; se suma aviso).
- Cada aviso enlaza a la pantalla correspondiente y se puede marcar como leído.
- Se generan una vez por día (al abrir la app el admin, se calculan y se insertan las novedades nuevas, sin duplicar).

## Detalle técnico
- Nueva tabla `alertas_rrhh` (tipo, título, detalle, enlace, fecha, leida, clave única para no duplicar) con RLS solo admin_rrhh + GRANTs.
- Hook `useRolEfectivo` aplicado a ~20 archivos; cambios acotados por archivo.
- Campanita en `UnifiedLayout` con `DropdownMenu`, badge de no leídas y realtime opcional.
- Generador de alertas: función cliente `generarAlertasRrhh()` ejecutada al iniciar sesión admin (idempotente por clave única del día).
- Sin cambios en RLS existente ni en Góndolas V2 / editor original.
