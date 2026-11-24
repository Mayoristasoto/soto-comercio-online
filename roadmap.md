# Roadmap

## Horario 2: copias y migración de la semana actual
- [x] Copiar o mover un turno a otra persona lleva solo el horario; el puesto es el propio del destino (copia, mover, varios a la vez, panel de disponibles).
- [x] Corregir los turnos ya copiados a Victor Emanuel Ibañez con puesto equivocado (3 turnos, ahora Auxiliar Depósito).
- [x] Cargar en la semana actual (16/11–22/11/2026) los horarios del sistema anterior, en borrador (6 sucursales, 125 turnos).
- [x] Sábado 21/11 ajustado según fichadas de los últimos 4 sábados (6 cambios, resto igual).
- [ ] Ver la grilla con sesión real: Supabase externo no permite iniciar sesión desde acá.

## Horario 2 más liviano + demo desde fichadas
- [x] Resumen, sucursales y "Cobertura y advertencias" plegables, recordados en el navegador; botón para desplegar/plegar todas.
- [x] Semanas 2/11 y 9/11 en borrador con 132 turnos armados desde fichadas reales (sin publicar).
- [ ] Ver la pantalla con sesión real: Supabase externo no permite restaurar la sesión.

## Extender turno a días consecutivos
- [x] Agregar flechas al abrir un turno para abarcar hasta tres días en la misma semana.
- [x] Guardar sin reemplazar otros turnos, validando ausencias, puestos y superposiciones; 26 pruebas correctas y compilación sin errores.
- [x] Flechas ‹ › y etiqueta "Extender" al pasar el mouse sobre un turno: extiende un día con un clic usando la misma extensión validada; 43 pruebas y compilación correctas.
- [ ] Verificar guardado integrado con sesión real (flechas del editor, hover y arrastre): Supabase externo no permite restaurar una sesión autenticada.

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
- [x] Horario 2: selección múltiple de turnos (Ctrl+clic) y arrastre conjunto estilo Excel vía prepararMovimientoMultiple; pendiente verificar guardado con sesión real.

## Panel de Encargado 2: equipo visible y vista por sucursal
- [x] RRHH elige qué empleados ve cada encargado, de cualquier sucursal ("Qué ve cada encargado"); sin configurar, ve su sucursal.
- [x] RRHH puede ver el panel como un encargado.
- [x] Planificación separada por sucursal (por día y por persona).
- [x] Quien está de vacaciones o licencia sale de la columna y queda como nota "No trabajan" abajo, avisando si tenía turno.
- [x] "Ajustar horarios" usa el mismo equipo; el encargado puede pedir cambios para esa gente.
- [ ] Verificar con sesión real de un encargado: Supabase externo no permite iniciar sesión desde acá.

- [ ] Panel de Encargado 2: en la planificación semanal, función para que el encargado agregue personal para el domingo (pendiente de definir con el usuario)
