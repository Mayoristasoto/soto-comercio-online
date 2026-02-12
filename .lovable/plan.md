

# Eliminar (anular) cruces rojas desde el Listado de Incidencias

## Contexto

La tabla `empleado_cruces_rojas` ya tiene los campos `anulada`, `anulada_por` y `motivo_anulacion`, y el listado actual filtra con `.eq("anulada", false)`. Solo falta agregar la accion en la interfaz.

## Cambios en `src/pages/ListadoIncidencias.tsx`

1. **Agregar boton de eliminar en cada fila** - Un icono de papelera (Trash2) al final de cada fila de la tabla.

2. **Agregar dialogo de confirmacion** - Al hacer clic en el boton, se abre un `ConfirmDialog` (variante destructive) que pide confirmar la anulacion. Opcionalmente se puede ingresar un motivo.

3. **Logica de anulacion** - Al confirmar, se ejecuta un UPDATE en `empleado_cruces_rojas` seteando:
   - `anulada = true`
   - `anulada_por = usuario actual (auth.uid)`
   - `motivo_anulacion = texto ingresado`
   - Luego se recarga la lista.

4. **Columna "Acciones"** en la tabla con el boton.

## Detalle tecnico

| Elemento | Detalle |
|----------|---------|
| Componente de confirmacion | `ConfirmDialog` de `@/components/ui/confirm-dialog` (ya existe) |
| Operacion DB | `UPDATE empleado_cruces_rojas SET anulada=true, anulada_por=uid, motivo_anulacion=motivo WHERE id=...` |
| Estado nuevo | `incidenciaAEliminar` (id seleccionado), `motivoAnulacion` (texto), `showConfirmDelete` (boolean) |
| Icono | `Trash2` de lucide-react |

No se requieren migraciones ni cambios de esquema.

