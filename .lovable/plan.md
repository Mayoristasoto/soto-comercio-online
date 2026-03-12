

## Plan: Esquema de Limpieza como Tarea del Kiosco

### Resumen
Crear un sistema de asignación de limpieza por día de la semana. Al hacer check-in, el empleado ve su tarea de limpieza asignada (informativa). Al fichar salida, el sistema incluye la tarea de limpieza en el diálogo de confirmación de tareas (`ConfirmarTareasDia`) para registrar si la realizó o no.

---

### 1. Nueva tabla: `limpieza_asignaciones`

```sql
CREATE TABLE public.limpieza_asignaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_semana int NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Domingo..6=Sábado
  empleado_id uuid REFERENCES public.empleados(id) ON DELETE CASCADE NOT NULL,
  zona text NOT NULL DEFAULT 'General', -- ej: "Baños", "Salón", "Depósito"
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE CASCADE,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(dia_semana, empleado_id, zona)
);

ALTER TABLE public.limpieza_asignaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read limpieza" ON public.limpieza_asignaciones
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage limpieza" ON public.limpieza_asignaciones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### 2. Nueva tabla: `limpieza_registros` (log de cumplimiento)

```sql
CREATE TABLE public.limpieza_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asignacion_id uuid REFERENCES public.limpieza_asignaciones(id),
  empleado_id uuid REFERENCES public.empleados(id) ON DELETE CASCADE NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  completada boolean NOT NULL DEFAULT false,
  registrado_en timestamptz DEFAULT now(),
  dispositivo text DEFAULT 'kiosco',
  UNIQUE(empleado_id, fecha, asignacion_id)
);

ALTER TABLE public.limpieza_registros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read limpieza_registros" ON public.limpieza_registros
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insert limpieza_registros" ON public.limpieza_registros
  FOR INSERT TO authenticated WITH CHECK (true);
```

### 3. RPC para kiosco (sin auth): `kiosk_get_limpieza_hoy`

Función `SECURITY DEFINER` que dado un `empleado_id` devuelve las asignaciones de limpieza del día actual (basado en día de la semana). Esto permite al kiosco (anon) consultarla.

### 4. Cambios en el Kiosco: Check-in (informativo)

**`src/pages/KioscoCheckIn.tsx`**:
- Después de registrar el fichaje de entrada, consultar `kiosk_get_limpieza_hoy` para el empleado
- Si tiene asignación, mostrar un alert informativo (similar a `TareasPendientesAlert`) indicando: "Hoy te toca limpieza de: [zona]"
- Se integra en la cola de alertas existente (configurable desde Configuración Kioscos)

**Nuevo componente**: `src/components/kiosko/LimpiezaAsignadaAlert.tsx`
- Muestra zona asignada, countdown auto-dismiss
- Solo informativo, no bloquea

### 5. Cambios en el Kiosco: Check-out (registro)

**`src/pages/KioscoCheckIn.tsx`**:
- En la función `verificarTareasPendientesSalida`, también consultar limpieza del día
- Inyectar la tarea de limpieza como tarea virtual (ID `limpieza-{asignacion_id}`) en el array de `tareasFlexibles` que se pasa a `ConfirmarTareasDia`

**`src/components/fichero/ConfirmarTareasDia.tsx`**:
- En `handleConfirmar`, detectar IDs que empiecen con `limpieza-` y en vez de insertar en `tareas`, insertar en `limpieza_registros` con `completada = true/false`
- Las tareas de limpieza no marcadas se registran como `completada = false`

### 6. Panel Admin: Configuración del esquema de limpieza

**Nuevo componente**: `src/components/admin/LimpiezaConfig.tsx`
- Grilla de 7 días (Lunes a Domingo)
- Para cada día: selector de empleados + zona
- CRUD sobre `limpieza_asignaciones`
- Filtro por sucursal

**Integrar** en la página de configuración admin existente como una nueva pestaña/sección.

### 7. Reportes

En `FichajeMetricasDashboard.tsx`, agregar una sección o pestaña "Limpieza" que muestre:
- Cumplimiento por empleado (% de días completados vs asignados)
- Datos de `limpieza_registros` agrupados por empleado y mes

---

### Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| Migration SQL | Crear tablas + RPC |
| `src/components/kiosko/LimpiezaAsignadaAlert.tsx` | Crear - alert informativo check-in |
| `src/components/admin/LimpiezaConfig.tsx` | Crear - admin CRUD |
| `src/pages/KioscoCheckIn.tsx` | Modificar - integrar limpieza en check-in y check-out |
| `src/components/fichero/ConfirmarTareasDia.tsx` | Modificar - manejar IDs `limpieza-*` |
| `src/pages/ConfiguracionAdmin.tsx` | Modificar - agregar pestaña Limpieza |

