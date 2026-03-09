

## Plan: Agregar preview de Confirmación de Tareas (sábado) en Test Kiosco Alertas

### Cambio
Agregar dos botones nuevos en `TestKioskoAlertas.tsx` para mostrar el componente `ConfirmarTareasDia` con datos mock:

1. **"Confirmar Tareas (modo normal)"** -- Muestra el dialog con tareas pendientes y opción de omitir
2. **"Confirmar Tareas Sábado (bloqueo salida)"** -- Muestra el dialog en modo `bloquearSalida=true` con tareas flexibles virtuales (IDs `flex-xxx`), sin botón omitir, obligando a marcar todas para poder salir

### Datos mock
- 3 tareas flexibles con IDs `flex-{uuid}-0/1/2` simulando "Control Stock Cigarrillos" y similares
- Prioridad alta, fecha límite hoy
- Modo bloqueo activado para la versión sábado

### Archivo modificado
**`src/pages/TestKioskoAlertas.tsx`**:
- Importar `ConfirmarTareasDia`
- Agregar estados `showConfirmTareas` y `showConfirmTareasSabado`
- Agregar 2 botones nuevos en la card de alertas (con iconos `CheckCircle2` y `CalendarX`)
- Renderizar `ConfirmarTareasDia` con props mock, usando `tareasFlexibles` para el modo sábado
- El `onConfirm` simplemente muestra un toast de confirmación (sin tocar DB)

