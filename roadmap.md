# Roadmap

## Extender turno a días consecutivos
- [ ] Agregar flechas al abrir un turno para abarcar hasta tres días en la misma semana.
- [ ] Guardar sin reemplazar otros turnos, validando ausencias, puestos y superposiciones; probar la lógica.

## Quitar turnos importados aprobados
- [x] Habilitar eliminación confirmada para RRHH mediante nueva versión en borrador, conservando la aprobación original.
- [x] Verificar reglas con 19 pruebas, permisos de la función y compilación correcta.
- [ ] Verificar eliminación integrada con sesión real: Supabase externo redirige a /auth; no se eliminaron registros durante las pruebas.

## Arrastrar turnos en Horario 2
- [x] Mover turnos entre días y empleados de una sucursal, conservando horario y descanso.
- [x] Mantener permisos y estados editables; 14 pruebas de lógica y arrastre visual aislado verificados, compilación correcta.
- [ ] Verificar guardado integrado con sesión real: Supabase externo no permite restaurar una sesión autenticada.

## Exportación visual diaria de descansos
- [x] Incorporar línea de tiempo por empleado del día y sucursal seleccionados.
- [x] Exportar PDF del día y PDF del período, organizado día por día, con franjas y nombres superpuestos.
- [x] Verificar ambos botones de descarga y PDFs con datos reales en aislamiento; corregir días vacíos y revisar línea de tiempo y primeras páginas.
- [ ] Verificar desde sesión integrada: acceso externo redirige a /auth; las descargas se probaron por separado.

## Densidad y superposición de descansos — octubre 2026
- [x] Agregar mapa diario por sucursal, franjas exactas y empleados superpuestos en Fichero.
- [x] Incluir resumen diario, mapa y superposiciones en Excel/PDF y entregar reporte de José Martí del 01/10 al 23/10, día final parcial.
- [x] Probar coincidencias, límites horarios y cruce de medianoche (10 pruebas); verificar mapa con datos reales en aislamiento y archivos (7 páginas PDF, 48 fórmulas sin errores).
- [ ] Verificar consulta y descarga integradas con sesión real: Supabase externo; la navegación real redirige a /auth. El mapa se probó por separado, no reemplaza esta verificación.

## Reporte de descansos — José Martí
- [x] Agregar sección Descansos en Fichero con fechas, sucursal y exportación Excel/PDF.
- [x] Entregar reporte de José Martí del 01/09 al 23/10/2026, sin modificar incidencias.
- [x] Verificar cálculos y archivos: 5 pruebas, 14 páginas PDF revisadas, Excel recalculado sin errores.
- [ ] Verificar consulta y descargas desde una sesión real: Supabase externo no permite restaurar una sesión; el navegador redirige a iniciar sesión.

## Informe de horarios asignados y observados — 23/10/2026
- [x] Exportar nómina completa y horarios vigentes a Excel.
- [x] Comparar fichadas de septiembre y octubre por día de semana, con excepciones e historial.
- [x] Entregar informe PDF revisado, sin modificar horarios ni incidencias.

## Recorrido de Salón (V2)
- [x] Fotos por criterio usando el bucket existente de Checklist, en carpeta separada.
- [x] Línea de tiempo compartida con usuario, fecha y cambios.
- [x] Checklist, Góndolas original y controles anteriores intactos.

## Reclutamiento — Entrevistas (MVP)
- [x] Base de datos: puestos, candidatos, disponibilidad, horarios, entrevistas e invitaciones con reserva atómica.
- [x] RRHH > Entrevistas con Agenda, Disponibilidad, Candidatos e Invitaciones.
- [x] Invitación con enlace único + mensaje de WhatsApp copiable.
- [x] Página pública móvil de autoreserva sin login.
- [x] Cancelar / marcar realizada / no asistió, liberando el horario.
- [ ] Etapas siguientes: formulario público "Trabajá con nosotros", carga de CV, preguntas de preselección, scoring/ranking y envío automático por WhatsApp.

## Control de insumos
- [x] Sucursales limitadas a Olazar 26, Juan B. Justo y José Martí.
- [x] Cierre de control: una vez cerrado no se edita; se abre un control nuevo.
- [x] Reabrir un control cerrado: solo admin_rrhh.

## Reorganización del sistema
- [x] Menú en 7 grupos, roles normalizados y Recorrido de Salón agregado.
- [x] Juego base de accesos por rol + botón "Aplicar juego base" en la matriz.
- [x] Pantallas clave (Vacaciones, Solicitudes, Fichero) respetan la vista simulada "Ver como".
- [x] Eliminada la lista de menú vieja (sidebar_links) y su editor.

## Plan: Ver como completo + Indicadores + Alertas (2026-09-22)
- [x] Vista simulada aplicada en todas las pantallas que bloquean por rol (Nómina, Admin, Stats, Controles, Rentabilidad, Fichaje, Ranking, Historial/Incidencias, Home, Panel Encargado, Góndolas V2)
- [x] Tablero de indicadores `/rrhh/indicadores` (solo admin_rrhh): ausentismo, tardíos, pausas, horas, extras, facturación, personal, vacaciones pendientes; filtro mes + sucursal; tarjetas enlazan al detalle
- [x] Alertas RRHH: tabla `alertas_rrhh` (RLS admin), generador idempotente por clave, campanita en encabezado con contador, marcar leídas, realtime habilitado
- [x] Kiosco modo prueba para admin_rrhh sin reconocimiento facial (desde dashboard)
- [ ] Banco de horas: UI RRHH (saldos, ajustes manuales, reglas) — pendiente definir reglas
