
# Agregar "Solicitar Vacaciones" en Autogestión del Kiosco

## Contexto

La página `/autogestion` muestra un menú con tarjetas: Mis Tareas, Solicitar Adelanto y Consultar Saldo. El usuario quiere agregar una cuarta opción "Solicitar Vacaciones" para que los empleados que autenticaron con reconocimiento facial puedan pedirlas desde el kiosco.

## Enfoque

Se agrega `'vacaciones'` al tipo `vistaActual` en `Autogestion.tsx` y se crea una vista inline (sin modal/Dialog, igual que las otras vistas). La lógica de validación de reglas ya existe en `SolicitudVacaciones.tsx` y se reutiliza directamente en `Autogestion.tsx`.

## Cambios en un solo archivo

Solo se modifica `src/pages/Autogestion.tsx`:

### 1. Nuevo estado y tipo de vista

```text
vistaActual: 'menu' | 'tareas' | 'adelantos' | 'saldo' | 'vacaciones'
```

Se agregan los estados necesarios:
- `fechaInicioVac` / `fechaFinVac` (Date | undefined)
- `motivoVac` (string)
- `enviandoVacaciones` (boolean)
- `conflictoVac` / `mensajeConflicto` (para el warning de superposición con compañeros)

### 2. Nueva tarjeta en el menú principal

Debajo de "Consultar Saldo", se agrega:

```text
[Ícono sol/palmera] Solicitar Vacaciones
                    Solicitá tus días de vacaciones
```

Color: naranja/amarillo para diferenciarlo visualmente.

### 3. Vista de vacaciones (inline)

Estructura igual a la vista de adelantos: encabezado con botón "Volver", y debajo:

- Selector de Fecha Inicio (Popover + Calendar)
- Selector de Fecha Fin (Popover + Calendar)
- Campo de Motivo (Textarea opcional)
- Panel de reglas activas (leyendo `localStorage 'vacaciones_reglas_activas'`)
- Banner de warning/conflicto si hay superposición con compañeros del mismo puesto/sucursal
- Botón "Solicitar Vacaciones"

Al enviar, se llama directamente a `supabase.from('solicitudes_vacaciones').insert(...)` con `empleado_id = empleadoId`.

### 4. Post-envío

Muestra toast de éxito y vuelve al menú de autogestión (sin redirigir al kiosco, el empleado puede seguir viendo otras opciones).

## Imports nuevos

- `CalendarIcon`, `Palmtree` (o `Sun`) de lucide-react
- `Calendar` de `@/components/ui/calendar`
- `Popover, PopoverContent, PopoverTrigger` de `@/components/ui/popover`
- `format` de `date-fns`
- `es` de `date-fns/locale`
- `cn` de `@/lib/utils`

## Sin cambios en base de datos

La tabla `solicitudes_vacaciones` ya existe y acepta inserciones con `empleado_id`, `fecha_inicio`, `fecha_fin`, `motivo`, `estado`. No se requieren migraciones.

## Flujo resultante

```text
Menú Autogestión
  └── Solicitar Vacaciones (nuevo)
        ├── Seleccionar Fecha Inicio
        ├── Seleccionar Fecha Fin
        ├── Motivo (opcional)
        ├── Validaciones (diciembre, receso invernal, conflictos)
        └── Enviar → toast OK → volver al menú
```
