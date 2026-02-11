

# Fix: Mostrar tareas activas del empleado en el WorkloadDashboard

## Problema

Al hacer click en un empleado en el dashboard de carga de trabajo, la consulta falla con error 400 porque el codigo usa `fecha_vencimiento` pero la columna real en la tabla `tareas` es `fecha_limite`.

Error del servidor:
```
"column tareas.fecha_vencimiento does not exist"
```

## Solucion

### Archivo: `src/components/tasks/WorkloadDashboard.tsx`

Corregir la funcion `loadTareasEmpleado` para usar los nombres de columna correctos:

1. Cambiar `fecha_vencimiento` por `fecha_limite` en el `select`
2. Cambiar `fecha_vencimiento` por `fecha_limite` en el `order`
3. Tambien usar `asignado_a` en lugar de `empleado_asignado` en el filtro `or` (segun el schema real de la tabla)
4. Actualizar todas las referencias a `tarea.fecha_vencimiento` en el JSX del dialog por `tarea.fecha_limite`

### Detalle tecnico

**Query corregida:**
```typescript
const { data, error } = await supabase
  .from('tareas')
  .select('id, titulo, descripcion, prioridad, estado, fecha_limite, created_at')
  .or(`asignado_a.eq.${empleado.id},empleados_asignados.cs.{${empleado.id}}`)
  .in('estado', ['pendiente', 'en_progreso'])
  .order('fecha_limite', { ascending: true, nullsFirst: false })
```

**JSX corregido:**
```typescript
{tarea.fecha_limite && (
  <span>
    <CalendarClock className="h-3 w-3" />
    {format(new Date(tarea.fecha_limite), "dd MMM yyyy", { locale: es })}
  </span>
)}
```

**Archivo modificado:**
- `src/components/tasks/WorkloadDashboard.tsx` - corregir nombres de columnas en la query y el render

