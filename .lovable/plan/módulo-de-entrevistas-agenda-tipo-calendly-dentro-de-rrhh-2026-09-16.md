# Módulo de Entrevistas (agenda tipo Calendly) dentro de RRHH

Primera etapa del futuro módulo de Reclutamiento. Objetivo del MVP: RRHH define su disponibilidad, invita a un candidato con un enlace único, el candidato elige un horario libre desde el celular, confirma, y la entrevista aparece en la agenda de RRHH sin posibilidad de doble reserva.

No se toca ningún módulo existente: se agregan páginas y tablas nuevas, reutilizando el mismo diseño, menú lateral y sistema de permisos de la plataforma.

## Qué vas a ver

Nueva sección **RRHH > Entrevistas** con cuatro pestañas:

1. **Agenda** — vista de Hoy / Semana / Próximas. Cada horario muestra hora, candidato, puesto, teléfono y estado (Pendiente, Confirmada, Realizada, No asistió, Cancelada) o "Disponible" si está libre. Filtros por fecha, puesto y estado. Al tocar una entrevista se abre la ficha del candidato con acciones: marcar realizada, no asistió, cancelar (libera el horario), reprogramar.
2. **Disponibilidad** — días habilitados, hora de inicio y fin por día (podés tener horarios distintos según el día), duración de la entrevista (15, 30, 45 o 60 minutos) y dirección/lugar. El sistema genera los horarios automáticamente. Podés bloquear o desbloquear un horario puntual, bloquear un día completo y agregar disponibilidad excepcional para una fecha.
3. **Candidatos** — listado mínimo con nombre, apellido, teléfono, email, puesto (Cajero/a, Repositor/a, Encargado/a, Logística, ampliable) y estado. Carga manual e **importación desde Excel/CSV** de tu base ya procesada, con vista previa antes de confirmar. Desde cada ficha, botón **Invitar a entrevista**.
4. **Invitaciones** — invitaciones generadas y pendientes de reserva, con "Copiar enlace" y "Copiar mensaje WhatsApp" (texto armado con nombre, puesto y enlace). El botón "Enviar por WhatsApp" queda visible pero desactivado, listo para conectar más adelante.

**Página pública del candidato** (`/entrevista/reservar/:token`): sin usuario ni contraseña, pensada para celular. Saludo con su nombre, lista de días con solo los horarios disponibles, pantalla de confirmación y pantalla final con día, fecha, hora y dirección. El candidato nunca ve otros candidatos, teléfonos ni datos internos.

Todo configurable: días, horas, duración, lugar/dirección (con posibilidad de dirección distinta por sucursal o por horario), texto del mensaje de WhatsApp y categorías de puesto.

Accesos: RRHH (admin_rrhh) gestiona todo; los encargados (gerente_sucursal) ven la agenda en modo lectura.

## Detalles técnicos

Rutas nuevas en `src/App.tsx`: `rrhh/entrevistas` (dentro de `UnifiedLayout`) y `/entrevista/reservar/:token` (pública, sin layout, siguiendo el patrón de `/calificar/:token`). Alta en `app_pages` para que aparezca en el menú bajo RRHH con `roles_permitidos` `{admin_rrhh, gerente_sucursal}`.

Tablas nuevas (todas con GRANT + RLS, `created_at`/`updated_at` y trigger de actualización):

- `reclutamiento_puestos` — categorías de candidato (nombre, activo, orden). Semilla: Cajero/a, Repositor/a, Encargado/a, Logística.
- `candidatos` — nombre, apellido, telefono, email, puesto_id, estado (enum `candidato_estado`: nuevo, preseleccionado, seleccionado_entrevista, invitacion_generada, pendiente_reserva, entrevista_confirmada, entrevistado, no_asistio, descartado, seleccionado), origen, notas, cv_url y `datos_extraidos jsonb` (reservados para el ATS futuro).
- `entrevistas_config` — perfil de disponibilidad: nombre, duracion_minutos, sucursal_id opcional, direccion, activo.
- `entrevistas_disponibilidad` — reglas por día (config_id, dia_semana, hora_inicio, hora_fin, activo) y excepciones por fecha (fecha, tipo: `bloqueo_dia` / `disponibilidad_extra`).
- `entrevistas_slots` — config_id, fecha, hora_inicio, hora_fin, estado (enum `slot_estado`: disponible, reservado, bloqueado), entrevista_id. **Índice único parcial** `(config_id, fecha, hora_inicio)` para impedir duplicados.
- `entrevistas` — candidato_id, slot_id, puesto_id, sucursal_id, direccion, estado (enum `entrevista_estado`: pendiente, confirmada, realizada, no_asistio, cancelada), reservado_at, notas, creado_por.
- `entrevistas_invitaciones` — candidato_id, token (texto aleatorio con `gen_random_bytes`, único, sin exponer IDs), estado, expira_at, invited_at, booked_at, entrevista_id.

Los horarios se materializan en `entrevistas_slots` al guardar la disponibilidad (generación por rango de fechas, típicamente las próximas 8 semanas), así el bloqueo por fila es real y el estado de cada horario es consultable.

Funciones RPC `SECURITY DEFINER` con `search_path = public` (no exponen tablas internas al público anónimo):

- `entrevista_slots_publicos(_token text)` — valida token vigente y devuelve solo fecha/hora de los horarios `disponible` (sin datos de otros candidatos).
- `entrevista_reservar(_token text, _slot_id uuid)` — reserva **atómica**: `UPDATE entrevistas_slots SET estado='reservado' WHERE id=_slot_id AND estado='disponible'` y, si no afectó ninguna fila, devuelve error "horario ya no disponible"; recién entonces crea la entrevista, marca la invitación como usada y actualiza el estado del candidato. Un único `UPDATE ... WHERE estado='disponible'` toma el lock de fila, de modo que dos candidatos simultáneos no pueden quedarse con el mismo horario.
- `entrevista_datos_candidato_publico(_token text)` — solo nombre de pila, puesto y dirección, para el encabezado de la página pública.
- `entrevista_liberar_slot(_entrevista_id uuid)` — al cancelar o reprogramar desde RRHH, vuelve el horario a `disponible`.

RLS: `admin_rrhh` (`is_admin_rrhh()`) gestiona todo; `gerente_sucursal` con permiso de solo lectura sobre entrevistas y slots; sin acceso directo del rol `anon` a ninguna tabla — el flujo público pasa exclusivamente por las RPC con `EXECUTE` a `anon` y `authenticated`.

Componentes nuevos en `src/components/entrevistas/` (`AgendaEntrevistas`, `ConfiguracionDisponibilidad`, `CandidatosLista`, `ImportarCandidatosDialog`, `InvitarCandidatoDialog`, `InvitacionesPendientes`, `entrevistasTypes.ts`) y páginas `src/pages/Entrevistas.tsx` y `src/pages/ReservarEntrevista.tsx`, con los componentes shadcn y tokens de color ya usados en la plataforma. Fechas y horas siempre en zona Argentina vía `src/lib/dateUtils.ts`. Importación de Excel/CSV con la librería de planillas ya presente en el proyecto.

Queda preparado, sin implementar: WhatsApp API, Google Calendar, emails, recordatorios, scoring/ranking, procesamiento automático de CV y cancelación/reprogramación por parte del candidato desde su enlace.
