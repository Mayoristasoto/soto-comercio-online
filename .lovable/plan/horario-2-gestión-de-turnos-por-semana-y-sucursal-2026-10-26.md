# Horario 2 — Gestión de turnos por semana y sucursal

Sección nueva **Horario 2** (solo admin_rrhh y gerentes), separada de las pantallas actuales. Usa las sucursales, puestos, empleados, roles, ausencias y vacaciones que ya existen. Cuando RRHH publica una semana, ese horario pasa a ser el que controla tardanzas y descansos en el kiosco.

## Boceto

```text
+-----------------------------------------------------------------------------+
| Horario 2        [< Semana 26/10 - 01/11 >] [Sucursal v] [Estado v] [Copiar] |
+-----------------------------------------------------------------------------+
| Borrador 1 | Pendiente 1 | Devuelto 0 | Aprobado 1 | Publicado 0             |
+-----------------------------------------------------------------------------+
| Empleado        Puesto   Lun     Mar     Mie     Jue     Vie   Sab   Dom    |
| JOSE MARTI  [Aprobado v2]                                                    |
| Laura Lan       Cajera   07:30-  10:30-  07:30-  ...                         |
|                          15:30   18:30   15:30                               |
|                          D 11:00                                             |
| Carlos Espina   Encarg.  ...     AUSENTE (vacaciones)   --                   |
+------------------------------------------------+----------------------------+
| Cobertura por franja de 30 min (dia elegido)   | Validacion                  |
| 07:30 Cajeros 2/3 FALTA  Repos 2/2  Enc 1/1    | Jose Marti - Gerente        |
| ...                                            | Aprobado 25/10 10:24        |
+------------------------------------------------+ Observaciones: ...          |
| Advertencias: superposicion, puesto no         | [Enviar] [Aprobar]          |
| habilitado, ausencia, falta cobertura          | [Devolver] [Publicar]       |
+------------------------------------------------+----------------------------+
Pestañas: Semana | Plantillas | Cobertura (configuración) | Puestos habilitados | Historial
```

Al hacer clic en una celda se abre un formulario: entrada, salida, puesto, sucursal, inicio del descanso (fin calculado con la duración configurada, por defecto 40 min) y observaciones. Vista compacta o detallada.

## Funcionamiento

1. **Crear semana** por sucursal: vacía, copiando otra semana (crea turnos nuevos y deja la original igual) o desde una plantilla rotativa de varias semanas. Después se puede editar cada turno.
2. **Validaciones en vivo**: turnos superpuestos, misma persona en dos sucursales, puesto no habilitado, ausencia o vacaciones aprobadas, falta de cobertura. Cada aviso explica el motivo; los críticos bloquean.
3. **Estados**: Borrador → Pendiente de validación → Aprobado o Devuelto (con observación obligatoria) → Publicado. Cada sucursal es independiente.
4. **Quién hace qué**:
   - RRHH arma, envía y publica.
   - El gerente de esa sucursal aprueba o devuelve, solo la suya.
   - El empleado ve únicamente sus horarios publicados.
5. **Excepción**: con faltas críticas, RRHH puede publicar igual si escribe un motivo, que queda registrado.
6. **Versiones**: si se cambia algo aprobado o publicado, se crea una versión nueva que vuelve a validación. La anterior se guarda con autor, fecha, motivo y cambios.
7. **Publicar**: el horario publicado pasa a mandar en el kiosco para esas fechas y esa sucursal. Fuera de esas semanas siguen rigiendo los turnos actuales.
8. **Cobertura**: se dejan los campos para cargar mínimos por sucursal, día, franja y puesto, vacíos por ahora. Mientras no haya mínimos, se muestra lo asignado sin marcar faltantes. No cuenta a quien está en descanso, ausente o en otra sucursal.
9. **Puestos habilitados**: RRHH elige qué puestos puede cubrir cada empleado. Su puesto actual viene marcado desde el inicio.

## Lo que no se toca

Las pantallas actuales de planificación, turnos, plantillas y cambios de horario siguen igual. No se borran datos. Las ventas no intervienen.

## Detalles técnicos

- Tablas nuevas en public, con permisos y RLS:
  - `h2_planes`: sucursal, inicio de semana, estado, versión, plan anterior, excepción y motivo.
  - `h2_turnos`: plan, empleado, fecha, entrada, salida, puesto, sucursal, inicio y fin de descanso, observaciones.
  - `h2_plantillas` y `h2_plantilla_items`: semana N, día y turno.
  - `h2_reglas_cobertura`: sucursal, día, franja desde/hasta, puesto y mínimo.
  - `empleado_puestos_habilitados`.
  - `h2_aprobaciones`: versión, usuario, decisión, observación y fecha.
  - `h2_historial`: autor, acción, motivo y diferencias en jsonb.
  - `h2_config`: tamaño de la franja (30 min) y duración del descanso (40 min).
- Las transiciones de estado solo se hacen con funciones SECURITY DEFINER (`h2_enviar`, `h2_aprobar`, `h2_devolver`, `h2_publicar`, `h2_nueva_version`, `h2_copiar_semana`, `h2_aplicar_plantilla`). Validan el rol con `has_role`, y para el gerente, `current_user_sucursal_id`. Se bloquea la edición de turnos que no estén en borrador o devueltos.
- La resolución del horario del día suma una prioridad: primero el turno de `h2_turnos` de un plan publicado, si existe, y si no, la lógica actual (`empleado_turnos`, cambios de horario). Esto se aplica en las funciones del kiosco y en `informe_puntualidad`, que ya usan esa resolución.
- El cálculo de validaciones y cobertura va en el módulo puro `src/lib/horario2.ts`, compartido por la grilla y los paneles, con pruebas bun: superposición, descanso de 40 min, ausencia, puesto no habilitado, cobertura que excluye descansos y copia sin alterar la semana original.
- Página nueva `/rrhh/horario-2`, con entrada en el sidebar (`app_pages`) para admin_rrhh y gerente_sucursal. Componentes en `src/components/horario2/`.
- Se agrega una regla en `AGENTS.md`.
