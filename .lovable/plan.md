# Autogestión del kiosco: vacaciones, adelantos y charlas con RRHH

## Diagnóstico: cómo funciona hoy

**Kiosco / Autogestión** (pantalla del kiosco a la que se entra con reconocimiento facial)
- Ya tiene 4 opciones: Mis tareas, Solicitar adelanto, Consultar saldo (Centum) y Solicitar vacaciones.
- Fichar y pedir descanso siguen en el kiosco de fichaje, aparte.

**Vacaciones**
- El empleado las pide desde el kiosco. Se valida que no se superpongan con otras del mismo puesto y sucursal, y los bloqueos (diciembre, receso de invierno). La solicitud queda "pendiente".
- En los últimos 90 días: 3 pendientes, 2 aprobadas y 1 gozada.
- El gerente ve las de su sucursal y carga el plan de cobertura. Pero **no hay un "OK del gerente" formal**: la solicitud sigue "pendiente" hasta que RRHH la aprueba. RRHH ya no puede aprobar sin cobertura enviada.
- Al empleado no se le avisa en el kiosco en qué paso está su pedido.

**Adelantos de sueldo**
- Se piden desde el kiosco y quedan como solicitudes generales: hoy hay 7 pendientes y 1 aprobada.
- **Los aprueba solo RRHH, en un paso.** El gerente no interviene.
- Los aprobados ya aparecen en Novedades de liquidación.

**Charlar con RRHH**
- No existe.
- La agenda de Entrevistas ya tiene horarios que abrís por semana (hoy hay 21 a futuro), con reserva que evita que dos personas tomen el mismo horario. Hoy esos horarios solo se usan para candidatos.

## Qué se construye

### 1. Circuito de aprobación en 2 pasos (vacaciones y adelantos)
```text
Empleado pide (kiosco) -> Gerente de sucursal -> RRHH -> Aprobada / Rechazada
```
- **Vacaciones:** el gerente revisa, carga la cobertura y toca "Aprobar y enviar a RRHH", o rechaza con motivo. RRHH aprueba, rechaza o sugiere cambios; eso último ya existe.
- **Adelantos:** el gerente da su visto bueno o rechaza con comentario. Después RRHH aprueba o rechaza.
- Si el pedido es del propio gerente, o el empleado no tiene gerente en su sucursal, va directo a RRHH.
- Cada paso guarda quién lo hizo, cuándo y el comentario.
- Avisos en la campanita: a RRHH cuando el gerente aprueba; al gerente cuando entra un pedido de su equipo.

### 2. "Mis pedidos" en el kiosco
- Nueva opción en Autogestión que muestra cada vacación y adelanto con su estado: "Esperando gerente", "Esperando RRHH", "Aprobada" o "Rechazada (motivo)".

### 3. Charla con RRHH (agenda compartida con Entrevistas)
- En la agenda de Entrevistas, cada horario que abrís puede ser **para entrevistas**, **para charlas con empleados** o **para ambos**. Por defecto es para ambos.
- Nueva opción en el kiosco, "Hablar con RRHH": el empleado ve los horarios libres, elige uno y escribe un motivo breve (opcional, marcado como privado).
- Un horario reservado por un empleado deja de estar libre para candidatos, y al revés.
- En el calendario de Entrevistas las charlas se ven en otro color, con el nombre del empleado. Podés cancelar, reprogramar o marcarlas como realizadas.
- Aviso en la campanita cuando un empleado reserva.

### 4. Orden del menú del kiosco
Autogestión queda con: Mis tareas, Solicitar vacaciones, Solicitar adelanto, Mis pedidos, Hablar con RRHH y Consultar saldo.

## Detalles técnicos
- `solicitudes_vacaciones` y `solicitudes_generales`: agregar `etapa` (`gerente` | `rrhh` | `finalizada`), `aprobado_gerente_por`, `fecha_aprobacion_gerente` y `comentario_gerente`. Al crear el pedido desde el kiosco, un trigger define la etapa inicial: `rrhh` si no hay gerente en la sucursal o si el que pide es el gerente. La columna `estado` se mantiene para no romper Novedades, el calendario ni las constancias.
- RPCs SECURITY DEFINER: `gerente_resolver_solicitud(tipo, id, aprobar, comentario)` valida que el pedido sea de la sucursal del gerente. `kiosk_mis_pedidos(empleado_id)` es para el kiosco.
- `AprobacionVacaciones.tsx` y `AprobacionSolicitudes.tsx`: el gerente ve la etapa `gerente` con botones Aprobar y enviar / Rechazar. RRHH ve la etapa `rrhh`, y como consulta también lo que está en la etapa del gerente.
- Agenda compartida: `entrevistas_slots.uso` (`entrevista` | `charla` | `ambos`, default `ambos`). Nueva tabla `charlas_rrhh` (empleado_id, slot_id, motivo, estado, notas_rrhh, timestamps) con GRANTs y RLS solo para admin_rrhh. Desde el kiosco se reserva con el RPC `kiosk_reservar_charla(empleado_id, slot_id, motivo)`, que es atómico y marca el slot como `reservado`. `entrevista_slots_publicos` y la reserva de candidatos pasan a filtrar `uso in ('entrevista','ambos')`.
- `CalendarioEntrevistas.tsx`: agrega las charlas con otro color. `DisponibilidadSemanal`: selector de uso al abrir la semana.
- `Autogestion.tsx`: nuevas vistas `mis_pedidos` y `charla`.
- Alertas: nuevos tipos `vacaciones_gerente_ok`, `adelanto_gerente_ok` y `charla_reservada` en `alertasRrhh.ts` y en la configuración de la campanita.
