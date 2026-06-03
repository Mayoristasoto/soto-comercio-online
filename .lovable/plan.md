
# Plan por fases — Grupos de Empleados reutilizables

Ya está lista la base (tabla `grupos_empleados`, RPC `resolver_grupo_empleados`, helper `gruposEmpleados.ts`, componente `SelectorEmpleadosOGrupo`, página `/rrhh/grupos-empleados`). Falta enchufarlo en los módulos y pulir la gestión. Lo dividimos en fases cortas para poder cortar en cualquier momento y retomar después.

---

## Fase 0 — Cierre de la base (15 min) ✅ casi listo
**Objetivo:** dejar la fundación accesible y visible.
- Agregar link "Grupos de empleados" en el sidebar de RRHH (`AppSidebar` / `app_pages`).
- Verificar permisos (admin_rrhh, gerente_general, gerente_sucursal) abriendo `/rrhh/grupos-empleados`.
- Migrar listas existentes de `liquidacion_listas_empleados` → `grupos_empleados` con `modulos_sugeridos=['nomina']` (si no se hizo aún).

**Checkpoint:** se puede crear/editar/eliminar grupos manuales y dinámicos.

---

## Fase 1 — Informes (mayor ROI, 1 sesión)
**Objetivo:** que cualquier informe se pueda generar para un grupo guardado.
- `InformeAsistenciaGerencial.tsx` → reemplazar picker por `<SelectorEmpleadosOGrupo modulo="informes" />`.
- `ReporteLlegadasTardeGerentes.tsx` → idem.
- `InformeEjecutivo.tsx` → idem.
- En cada uno, usar `getEmpleadosDeSeleccion(value)` para alimentar las queries existentes.

**Checkpoint:** generar PDF "Llegadas tarde de Gerentes Sucursal" con un solo click.

---

## Fase 2 — Nómina / Novedades (reemplazo del sistema viejo)
**Objetivo:** unificar `ListasEmpleadosManager` con el nuevo selector.
- `NovedadesLiquidacion.tsx` → cambiar uso de `ListasEmpleadosManager` por `<SelectorEmpleadosOGrupo modulo="nomina" />`.
- Mantener compatibilidad: las listas viejas ya migradas aparecen como grupos.
- Marcar `ListasEmpleadosManager` como deprecated.

**Checkpoint:** liquidar novedades de un grupo "Empleados Centro" sin volver a tildar.

---

## Fase 3 — Vacaciones
**Objetivo:** filtros y aprobaciones masivas por grupo.
- `AprobacionVacaciones.tsx` → filtro "Ver solo solicitudes de grupo X".
- `CalendarioVacaciones.tsx` → toggle para mostrar solo empleados del grupo.
- `MisVacaciones` queda como está (es vista personal).

**Checkpoint:** ver el calendario filtrado por grupo "Cajas".

---

## Fase 4 — Fichero / Asistencia
**Objetivo:** ver fichajes y balances por grupo.
- `Fichero.tsx` → agregar selector arriba para filtrar la grilla.
- Reporte de horas trabajadas (`ReporteHorasTrabajadas`) → integrar selector.
- Informe diario de ausencias → filtrar por grupo.

**Checkpoint:** ver el balance diario de un grupo "Sucursal Norte".

---

## Fase 5 — Tareas y delegaciones
**Objetivo:** asignar masivamente.
- `CreateTaskDialog.tsx` → opción "Asignar a grupo".
- `BulkDelegateDialog.tsx` → seleccionar destinatarios via grupo.
- Crear N tareas (una por empleado resuelto) reutilizando edge function `crear-tareas-batch`.

**Checkpoint:** crear "Capacitación seguridad" para un grupo de 25 empleados en un click.

---

## Fase 6 — Módulos secundarios (por demanda)
Enchufes rápidos cuando se pidan:
- Anotaciones (`NuevaAnotacion.tsx`) — anotación masiva.
- Entregas (`EntregasEmpleados.tsx`) — registrar entrega a grupo.
- Calendarios (`EmpleadosAfectadosPicker.tsx`) — arrobar grupo.
- Evaluaciones (`AsignarEvaluacion.tsx`) — asignar a grupo.

---

## Fase 7 — Mejoras de gestión (opcional, cuando duela)
- Preview en vivo de empleados resueltos en el editor dinámico.
- Editor visual de filtros dinámicos con autocompletes (sucursal/puesto/rol).
- Botón "Duplicar grupo" y "Exportar empleados del grupo a CSV".
- Auditoría: quién resolvió qué grupo y cuándo (tabla `grupos_empleados_uso`).
- Grupos privados vs compartidos con UI clara.

---

## Detalles técnicos comunes a cada fase
- Patrón de integración (no cambia entre módulos):
  ```tsx
  const [sel, setSel] = useState<SeleccionEmpleados | null>(null);
  // ...
  <SelectorEmpleadosOGrupo value={sel} onChange={setSel} modulo="informes" />
  // al ejecutar:
  const ids = await getEmpleadosDeSeleccion(sel);
  // usar `ids` en la query/RPC existente
  ```
- Si el módulo ya hacía un `select().in('empleado_id', ids)`, el cambio es transparente.
- No tocar lógica de negocio: solo el origen de la lista de IDs.

---

## Sugerencia de hoy
Hacer **Fase 0 + Fase 1 (solo "Llegadas tarde de Gerentes")** en esta sesión. Es lo que más se va a usar y deja un patrón replicable para que retomemos cualquier otro módulo en una sesión corta.

