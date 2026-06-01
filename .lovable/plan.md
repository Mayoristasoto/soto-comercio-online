## Informe gerencial de llegadas tarde y ausencias (6 meses)

Nueva página **`/rrhh/informe-asistencia-gerencial`** con flujo en 3 pasos: filtrar → revisar/anotar → generar PDF.

---

### 1. Filtros (panel superior)

- Rango de fechas (default: últimos 6 meses).
- Selector de **alcance**:
  - Todos los empleados activos
  - Por sucursal/es (multi-select)
  - Listas guardadas (reutiliza `liquidacion_listas_empleados`)
- Tipo de evento (checkboxes): Llegadas tarde / Ausencias / Ambas.
- Botón **"Cargar datos"** que dispara la consulta.

### 2. Tabla revisable

Una fila por evento (llegada tarde o ausencia), columnas:

`Empleado · Sucursal · Fecha · Tipo · Detalle (min retraso / día ausente) · Categoría · Observación · Acciones`

- **Categoría**: select con opciones definidas en una nueva pantalla de configuración (ver punto 4). Categorías iniciales precargadas:
  - Sin justificar
  - Cambio de turno no actualizado
  - Turno médico
  - Trámite personal autorizado
  - Falla técnica de fichaje
  - Justificada (otro)
- **Observación**: texto libre (ej.: "presentó certificado", "cambió turno con Pérez").
- Cada cambio se guarda automáticamente (debounced).
- Filtros rápidos sobre la tabla cargada: por estado (anotado / pendiente), por categoría, por empleado, por sucursal.
- Contador en vivo: pendientes de revisar / total.

### 3. Generación del informe PDF

Botón **"Generar informe"** produce un PDF con:

- **Portada**: rango, alcance, fecha de emisión, totales generales (empleados involucrados, llegadas tarde totales, ausencias totales, minutos acumulados, % justificadas).
- **Resumen ejecutivo**: ranking de empleados con más eventos no justificados; desglose por categoría con conteo y porcentaje; gráfico simple por sucursal.
- **Anexo completo**: tabla por empleado con todos los eventos, mostrando categoría y observación. Filas sin justificar resaltadas en `#e04403`; justificadas en gris claro.
- Paleta corporativa (Primary `#4b0d6d`, Secondary `#95198d`, Accent `#e04403`), encabezado/pie con logo y paginación, en línea con `reporteLlegadasTardePDF.ts`.
- Export adicional XLSX con la misma data tabulada (opcional, mismo botón con dropdown).

### 4. Configuración de categorías (persistente)

Pantalla pequeña en **Configuración → Asistencia → Categorías de justificación** donde el admin puede agregar, renombrar, activar/desactivar y reordenar categorías. Color opcional por categoría para el PDF.

### 5. Persistencia de anotaciones

Las justificaciones quedan guardadas a nivel evento (no por informe): si en 3 meses se regenera el reporte, las anotaciones previas aparecen ya cargadas. Si una llegada tarde queda anulada por el módulo de incidencias existente, no se muestra.

---

### Detalles técnicos

**Migraciones nuevas:**

1. `categorias_justificacion_asistencia` — `id`, `nombre`, `color`, `orden`, `activa`, `es_justificada` (bool, true para todo menos "Sin justificar"). RLS: lectura `authenticated`, escritura admin/rrhh. Seed con las 6 categorías iniciales.
2. `justificaciones_asistencia` — `id`, `tipo_evento` (`'llegada_tarde'` | `'ausencia'`), `evento_ref_id` (uuid del fichaje tardío o ausencia), `empleado_id`, `fecha_evento` (date), `categoria_id`, `observacion`, `creado_por` (auth.uid), `created_at`, `updated_at`. Índice único `(tipo_evento, evento_ref_id)` para upsert. RLS: `authenticated` puede SELECT/INSERT/UPDATE/DELETE; auditoría via `creado_por`.
3. RPC `get_eventos_asistencia(p_desde, p_hasta, p_sucursales uuid[], p_empleados uuid[], p_tipos text[])` SECURITY DEFINER: cruza `fichajes_tardios` (no anulados) + ausencias derivadas de `asistencia_diaria` / lógica existente del módulo, hace LEFT JOIN con `justificaciones_asistencia` y devuelve todo en un solo set. Aplica `debeOmitirControles` (feriados/domingos) si corresponde.

**Frontend nuevo:**

- `src/pages/InformeAsistenciaGerencial.tsx` — orquestador (filtros + tabla + acciones de exportación).
- `src/components/informe-asistencia/FiltrosInforme.tsx` — reutiliza `ListasEmpleadosManager` y selector de sucursales existente.
- `src/components/informe-asistencia/TablaEventosRevisables.tsx` — tabla virtualizada (>500 filas), edición inline de categoría/observación con upsert a `justificaciones_asistencia`.
- `src/components/informe-asistencia/CategoriaSelect.tsx`.
- `src/pages/ConfiguracionCategoriasJustificacion.tsx` — CRUD de categorías.
- `src/utils/informeAsistenciaGerencialPDF.ts` — generador estilo `reporteLlegadasTardePDF.ts`, paleta corporativa.
- `src/utils/informeAsistenciaGerencialXLSX.ts` — opcional, dos hojas (Resumen, Detalle).

**Ruta y sidebar:** agregar entrada en `app_pages` ("Informe gerencial de asistencia", sección RRHH, permiso admin/rrhh).

**Fuera de alcance:**
- No se modifica la lógica que detecta llegadas tarde o ausencias (solo se consume).
- No se notifica automáticamente al empleado.
- Las categorías no afectan liquidación de sueldos.