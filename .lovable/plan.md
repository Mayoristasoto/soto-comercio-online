# Corrección de horarios de los sábados — José Martí

## Regla a aplicar

Solo los **sábados**, cada empleado activo de José Martí debe tener entrada programada a las **07:30** o a las **08:30**. Los horarios de lunes a viernes no se modifican.

## Resultado de la revisión: agosto y septiembre de 2026

Según la primera entrada registrada de cada sábado:

### Grupo 07:30
- **Carlos Adrián Espina:** 9 de 9 sábados cerca de las 07:30.
- **Jesica Anahí Romero:** 7 de 7 cerca de las 07:30.
- **Laura Lorena Lan:** 7 de 7 cerca de las 07:30.
- **Silvia Natalia Soledad Estanga:** 1 registro, a las 07:24; se propone 07:30 de forma provisoria.

### Grupo 08:30
- **Jonathan Jesús Vera:** 9 de 9 sábados cerca de las 08:30; ya quedó configurado 08:30–16:30.
- **Joseph Daniel Chumpitaz Bartolo:** pasó de 07:30 a aproximadamente 08:20 durante el período; sus 5 sábados más recientes respaldan 08:30.
- **Julio César Gómez Navarrete:** normalmente cerca de las 08:30; hay un registro aislado a las 12:18 que no se usará como horario habitual.
- **Ricardo Daniel Conforti:** 8 de 8 cerca de las 08:30.
- **Romina Jésica Palma:** 1 registro, a las 08:25; se propone 08:30 de forma provisoria.

### Sin horario propuesto
- **dwadad dwaddw:** no tiene fichajes de sábado ni horario asignado. Se dejará sin cambios hasta confirmar si es un empleado real y cuál es su horario.

## Cambios a realizar

1. Configurar el sábado con jornada completa de ocho horas:
   - Grupo 07:30: **07:30–15:30**.
   - Grupo 08:30: **08:30–16:30**.
2. Mantener intactos todos los horarios de lunes a viernes, incluidos los turnos de 10:30–18:30.
3. Crear horarios individuales para quienes comparten un turno general pero necesitan un sábado diferente. Así el cambio de una persona no modifica a sus compañeros.
4. Dar horario de sábado a Romina y Silvia sin inventarles horarios de lunes a viernes.
5. Aplicar la corrección desde el próximo sábado, sin alterar fichajes, tardanzas ni cruces rojas históricos.
6. Verificar al terminar que cada empleado tenga un solo horario aplicable por sábado y que no existan asignaciones superpuestas.

## Control posterior

- Durante los próximos cuatro sábados, comparar la entrada real con el horario asignado.
- Revisar especialmente a **Romina** y **Silvia**, porque solo tienen un sábado registrado.
- Si acumulan al menos tres sábados consistentes en el otro grupo, corregir su horario sin tocar el historial anterior.

## Detalle técnico

- Los cambios serán únicamente de datos en `fichado_turnos` y `empleado_turnos`.
- Se evitará modificar directamente un turno compartido cuando eso pueda afectar a empleados con otro horario sabatino.
- La validación final comprobará días asignados, vigencia, hora de entrada, hora de salida y duplicados por empleado.
