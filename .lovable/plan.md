# Flujo de la jornada: desde la entrada hasta la salida

Esto es solo una explicación de cómo funciona hoy el sistema. No cambia nada.

```text
EMPLEADO LLEGA AL KIOSCO
        |
        v
[1] IDENTIFICACION
    - Reconocimiento facial (acepta desde 60% de parecido con sus 3 fotos más recientes)
    - o PIN (por defecto, los últimos 4 números del DNI): toma foto obligatoria,
      pide GPS siempre y bloquea el PIN después de varios intentos fallidos
        |
        v
[2] ¿QUE DIA ES?
    - Domingo o feriado CON controles apagados -> registra la entrada, pero
      no cuenta llegadas tarde ni descansos de más
    - Domingo o feriado con horario especial -> usa ese horario y esa tolerancia
    - Sábado -> usa el horario de sábado de cada empleado
      (José Martí: 07:30 o 08:30, jornada de 8 h)
    - Lunes a viernes -> horario asignado para ese día
        |
        v
[3] FICHAJE DE ENTRADA
    - Compara la hora con el horario de entrada
    - Tolerancia: 0 minutos desde el 1/10 (antes era 1 minuto)
    - Si llegó tarde: queda registrada la llegada tarde y suma 1 cruz roja
      -> en el mes: a la 2da, aviso a RRHH y al encargado en la campanita;
         a la 3ra, llamado de atención en el legajo; a la 5ta, apercibimiento
    - El kiosco le muestra: cuántas llegadas tarde y descansos de más lleva
      en el mes, novedades del día (una vez por día) y tareas pendientes
        |
        v
[4] DURANTE LA JORNADA: DESCANSO
    - Inicio de pausa -> el kiosco marca el tiempo en curso
    - Fin de pausa -> calcula los minutos completos
    - Más de 40 min -> descanso de más + 1 cruz roja (misma escala que en [3])
    - Descanso fuera de la franja asignada o sin turno -> incidencia
        |
        v
[5] SALIDA
    - Antes de cerrar, revisa las tareas pendientes:
      - Lunes a viernes: las tareas obligatorias del día no dejan salir
      - Sábado: además no deja salir si no se cumplieron las tareas
        semanales flexibles
    - Sábado: si lleva 2 o más cruces rojas en la semana, se muestra la advertencia
    - Registra la salida y calcula las horas: trabajadas, menos los descansos,
      comparadas con lo que le tocaba ese día
        |
        v
[6] DESPUES DE LA JORNADA (automático)
    - Si no fichó la salida -> aviso por WhatsApp (cuando esté activado)
    - Las horas extra entran en la liquidación (por la tarde se toma como
      referencia las 09:00; 19 min = media hora, 45 min = 1 hora)
    - Todo se ve en el Informe de puntualidad, el Índice de ausentismo y
      la planilla para el estudio contable
    - Tareas del día siguiente: se generan a las 03:00 hora argentina
```

## Resumen por día

| Día | Llegada tarde | Descanso de más | Bloqueo por tareas | Extra |
|---|---|---|---|---|
| Lunes a viernes | Sí, con 0 min de tolerancia | Sí, más de 40 min | Tareas del día | — |
| Sábado | Sí, con el horario de sábado | Sí | Tareas del día y de la semana | Advertencia si lleva 2 o más cruces en la semana |
| Domingo o feriado | Solo si los controles están prendidos | Solo si los controles están prendidos | Igual | Puede tener horario especial |

## Detalle técnico
- Funciones `detectar_fichaje_tardio` / `detectar_exceso_pausa` (tolerancia tomada de `fichado_configuracion`), y `aplicar_escala_exigencia` que se dispara después de cada llegada tarde o descanso de más.
- `debeOmitirControles()` en el archivo `diasEspecialesService`, con datos de `dias_feriados` y `config_dias_especiales`.
- Horario de sábado definido por día en `fichado_turnos`.
- Tareas generadas a las 06:00 UTC.
