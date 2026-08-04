# Panel de encargados editable para todos + análisis de Planificación semanal

## Parte 1 — Que los textos y rutas valgan para todos los encargados

Hoy la edición de las tarjetas se guarda solo en el navegador del admin (localStorage), así que los encargados siguen viendo los textos por defecto. Se pasa la configuración a la base de datos.

Qué se construye:
- Nueva tabla `encargado_dashboard_accesos` con: orden, título, descripción, icono, ruta destino y activo/inactivo.
- Se cargan las 4 tarjetas actuales como datos iniciales (vacaciones, inventario, planificación semanal, cambios de horario por día).
- Lectura: cualquier usuario autenticado (los encargados ven lo que configura RRHH).
- Escritura: solo `admin_rrhh`.
- El panel del encargado y la vista previa leen de la tabla; si falla la lectura, caen a los valores por defecto para no dejar el panel vacío.

En la vista previa (`/preview-panel-encargado`) el admin podrá:
- Editar título, descripción y ruta de cada tarjeta (se guarda en la base y lo ven todos).
- Elegir el icono de una lista corta.
- Mostrar/ocultar una tarjeta y reordenarlas (subir/bajar).
- Ver la ruta debajo de cada tarjeta (ya está) y restaurar los valores por defecto.

## Parte 2 — Análisis: sí, hay funciones duplicadas

Verificado en el código: **dos lugares distintos escriben en las mismas tablas** `planificacion_semanal` y `planificacion_semanal_detalle`.

```text
/admin/planificacion-semanal  (src/pages/PlanificacionSemanal.tsx)
  - Plantillas semanales base (plantillas_trabajo_semanal / plantilla_trabajo_detalle)
  - Asignaciones de domingos y feriados (dias_feriados)
  - Carga masiva de horarios
  - Crear planificación de la semana desde una plantilla
        -> escribe planificacion_semanal + planificacion_semanal_detalle

Fichero > Horarios > pestaña "Semana"  (VistaSemanaPlanificacion.tsx)
  - Armado día por día con tramos, sucursal por tramo, horas extras
  - Copiar día / copiar semana, exportar PDF, aplicar y revertir
        -> escribe planificacion_semanal + planificacion_semanal_detalle
```

Es decir: la versión de Fichero > Horarios es la nueva y completa (tramos, extras, cobertura, exportes, aplicar/revertir); la de `/admin/planificacion-semanal` es la anterior y solapa la parte de "armar la semana", pero además tiene cosas que la nueva no tiene (plantillas base, domingos/feriados, carga masiva).

Propuesta de ordenamiento (sin borrar nada todavía):
- La tarjeta "Planificación semanal" del panel del encargado apunta hoy a `/admin/planificacion-semanal` (la vieja). Se cambia a la pestaña Semana de Fichero > Horarios, que es la que usás para cubrir vacaciones y ausencias.
- `/admin/planificacion-semanal` queda como pantalla de configuración de base (plantillas, domingos/feriados, carga masiva) y se le quita el bloque de "crear planificación de la semana" para que no haya dos formas de generar lo mismo. Si preferís, en esta primera etapa solo se agrega un aviso con link a la vista nueva y no se elimina nada.

Confirmá cuál de las dos opciones querés para el punto de duplicación; el resto se implementa igual.

## Detalles técnicos

- Migración: `CREATE TABLE public.encargado_dashboard_accesos` (id uuid, orden int, titulo text, descripcion text, icono text, url text, activo bool default true, timestamps), GRANT a `authenticated` (select) y `admin_rrhh` vía policy para insert/update/delete, GRANT ALL a `service_role`, RLS habilitada, seed con las 4 tarjetas actuales.
- `src/hooks/useEncargadoAccesos.ts`: pasa de localStorage a react-query sobre la tabla, con mutaciones de guardado/orden/visibilidad y fallback a las constantes por defecto.
- `DashboardEncargado.tsx`: sigue recibiendo los accesos por prop; mapa de iconos ampliado.
- `PreviewPanelEncargado.tsx`: diálogo de edición con icono, orden y switch de visibilidad.
