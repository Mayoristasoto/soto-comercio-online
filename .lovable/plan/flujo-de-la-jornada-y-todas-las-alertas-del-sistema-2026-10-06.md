# Flujo de la jornada y todas las alertas del sistema

Esto es solo una explicación de cómo funciona hoy. No cambia nada.

## 1. Flujo de la jornada: desde la entrada hasta la salida

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
      (José Martí: 07:30 u 08:30, jornada de 8 h)
    - Lunes a viernes -> horario asignado para ese día
        |
        v
[3] FICHAJE DE ENTRADA
    - Compara la hora con el horario de entrada
    - Tolerancia: 0 minutos desde el 1/10 (antes era 1 minuto)
    - Si llegó tarde: queda registrada la llegada tarde y suma 1 cruz roja
    - El kiosco le muestra: cuántas llegadas tarde y descansos de más lleva
      en el mes, novedades del día (una vez por día) y tareas pendientes
        |
        v
[4] DURANTE LA JORNADA: DESCANSO
    - Inicio de pausa -> el kiosco marca el tiempo en curso
    - Fin de pausa -> calcula los minutos completos
    - Más de 40 min -> descanso de más + 1 cruz roja
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

## 2. Todas las alertas del sistema

### A. Alertas de asistencia (las del empleado)

| Alerta | Cuándo salta | Dónde se ve | Consecuencia |
|---|---|---|---|
| Llegada tarde | Entró después de su horario (tolerancia 0 min desde el 1/10) | Registro + informe de puntualidad | 1 cruz roja |
| Descanso de más | La pausa superó los 40 min | Registro + informe | 1 cruz roja |
| Descanso fuera de franja / sin turno | Empezó o terminó la pausa fuera del horario asignado | Incidencias | Incidencia para revisar |
| No fichó la salida | Terminó el día sin marcar salida | Aviso por WhatsApp + alerta | Aviso automático |
| Cruces rojas del sábado | 2 o más cruces rojas en la semana | Advertencia en el kiosco el sábado | Solo advertencia visual |

### B. Escala de exigencia (desde el 1/10, tolerancia 0)

Cada llegada tarde o descanso de más suma. Contando lo del mes en curso:

```text
1ra vez  -> solo queda registrada (cruz roja)
2da vez  -> aviso en la campanita a RRHH y al encargado de su sucursal
3ra vez  -> llamado de atención automático en el legajo del empleado
5ta vez  -> apercibimiento automático en el legajo
```

Además, el kiosco le muestra al empleado su contador del mes cada vez que ficha.

### C. Alertas para RRHH y encargados (campanita y dashboard)

| Alerta | Cuándo salta |
|---|---|
| Aviso de escala (2da falta del mes) | Automático, llega a RRHH y al encargado de la sucursal |
| Alertas RRHH generales | Se generan solas (una por tema, sin repetir) y llegan a la campanita del encabezado con contador y aviso en tiempo real |
| Tareas pendientes del equipo | El encargado las ve en su panel |
| Solicitudes pendientes | Vacaciones, solicitudes generales, justificaciones esperando aprobación |
| Incidencias del día | Tarjeta en el dashboard |
| Novedades del día | Se muestran en el kiosco al fichar, una sola vez por día por empleado |

### D. Alertas por WhatsApp (vía Whaticket, en puesta en marcha)

| Mensaje | Cuándo se manda |
|---|---|
| Salida no fichada | Al detectar que no marcó la salida |
| Cumpleaños y aniversarios | El día correspondiente |
| Encuesta a clientes | Con el link de la encuesta y el descuento |
| Invitación a entrevista | Link de autoreserva para el candidato |

Todos los envíos quedan en el registro de la página WhatsApp (enviado o fallido, con el motivo). Pendiente de confirmar el primer envío real.

### E. Bloqueos (no son avisos: impiden la acción)

- Tareas obligatorias del día sin terminar: no deja fichar la salida.
- Sábado con tareas semanales flexibles sin cumplir: no deja fichar la salida.
- Documentos obligatorios sin firmar: pantalla bloqueante hasta firmar.
- PIN bloqueado tras varios intentos fallidos: lo desbloquea un admin.

### F. Qué NO genera alerta

- Domingos y feriados con controles apagados: se registra el fichaje pero no cuenta llegadas tarde ni descansos de más.
- Fichajes corregidos o rechazados: quedan en la auditoría, sin cruz roja.

## Detalle técnico
- `detectar_fichaje_tardio` / `detectar_exceso_pausa` (tolerancia de `fichado_configuracion`); `aplicar_escala_exigencia` se dispara tras cada llegada tarde o descanso de más y escribe en `notificaciones` y `empleados_anotaciones`.
- `debeOmitirControles()` con `dias_feriados` y `config_dias_especiales`.
- Alertas RRHH: tabla `alertas_rrhh` (solo admin), campanita con tiempo real.
- Contador del kiosco: `kiosk_contador_exigencia`; novedades vistas: `novedades_vistas`.
- WhatsApp: función `whaticket-send` + registro en `whatsapp_envios`.
