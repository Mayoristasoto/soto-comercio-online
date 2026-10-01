# Pendientes de Notas + Informe por empleado + Exigencia del mes

## Parte 1: lo que faltó del plan de notas
1. **Etiqueta "nota RRHH"** en la vista grilla de la planilla del Estudio, para distinguir las notas rápidas de las ediciones a mano.
2. **Sección "Notas para el Estudio" en el perfil del empleado**: historial de todas sus notas por mes, con su destino, quién la cargó y si ya se envió. RRHH puede agregar una nota desde ahí mismo.

## Parte 2: informe de cada empleado (para las reuniones)
Nueva pantalla **"Informe de puntualidad"** dentro de Asistencia (solo RRHH):
- Filtros: rango de meses (por defecto, los últimos 4), sucursal y empleado.
- **Resumen por empleado**: llegadas tarde por mes, minutos totales y promedio de atraso, excesos de descanso por mes, minutos excedidos y cruces rojas. Se marca si mejora o empeora.
- **Aviso de datos dudosos**: si el atraso promedio pasa de 120 min o no tiene horario asignado ese día, la fila se marca como "revisar horario" para no reclamarlo en la reunión sin verificar.
- **Detalle**: fecha, horario asignado, hora real de entrada y minutos tarde. Para descansos: inicio, fin, minutos usados y minutos excedidos.
- **PDF por empleado** con los colores de la empresa: resumen mes a mes, detalle, texto "Compromiso del mes" y espacio para la firma del empleado y de RRHH. Hay un botón para descargar los PDF de todos juntos (ZIP).
- Botón "Registrar reunión": crea una anotación de "llamado de atención" en el legajo con la fecha y la observación.

## Parte 3: propuesta de exigencia desde este mes (octubre)
Valores propuestos, que se pueden modificar en Configuración:
- Tolerancia de llegada: **0 minutos** (hoy es 1).
- Descanso: 40 minutos, con **0 minutos de tolerancia**.
- Escalas por mes (llegadas tarde y excesos se cuentan por separado):
  - 1ra vez: aviso al empleado en el kiosco.
  - **2da vez**: aviso a RRHH y al encargado en la campanita.
  - **3ra vez**: anotación automática de "llamado de atención" en el legajo.
  - **5ta vez**: anotación de "apercibimiento" y alerta a RRHH para citar al empleado.
- Al fichar, el kiosco muestra el contador del mes ("Llevás 2 llegadas tarde en octubre").
- Se mantienen las excepciones actuales: domingos, feriados sin controles y justificaciones aprobadas no cuentan.

## Orden
1 → 2 → 3. Así el informe queda listo para las reuniones antes de que empiecen a correr las nuevas reglas.

## Detalles técnicos
- Parte 1: el campo `origen: 'nota'` se agrega en las filas fusionadas de `EditorEstudioContable` y se muestra con un Badge. El perfil del empleado consulta `novedades_estudio_notas` por empleado_id y cruza las versiones enviadas para mostrar el estado.
- Parte 2: una RPC `informe_puntualidad(desde date, hasta date, sucursal uuid)` SECURITY DEFINER, restringida a admin_rrhh, que agrupa `fichajes_tardios` y `fichajes_pausas_excedidas` por empleado y por mes, y suma un flag de sospecha según el promedio y si falta horario. El PDF se arma con jsPDF (ya está en uso) y el ZIP con JSZip. Las reuniones se guardan como inserción en `empleados_anotaciones`.
- Parte 3: los parámetros (`tolerancia_llegada_min`, `tolerancia_pausa_min`, `escalas` en jsonb) se guardan en `fichado_configuracion`. Habrá un trigger AFTER INSERT en `fichajes_tardios` y en `fichajes_pausas_excedidas` que cuente las del mes (en hora de Argentina), cree la `notificaciones` y la `empleados_anotaciones` según la escala, sin duplicar. `detectar_fichaje_tardio` y `detectar_exceso_pausa` pasan a leer la tolerancia configurada. El contador del kiosco sale de una RPC con GRANT anon.
