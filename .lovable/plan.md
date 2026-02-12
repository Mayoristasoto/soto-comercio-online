

# Fix: Agregar 'semanal_flexible' al constraint de frecuencia

## Problema

La tabla `tareas_plantillas` tiene un CHECK constraint que solo permite estos valores de frecuencia: `diaria`, `semanal`, `mensual`, `manual`. Al intentar guardar con `semanal_flexible`, la base de datos rechaza el valor con error 400.

## Solucion

Ejecutar una migracion SQL que elimine el constraint actual y lo recree incluyendo el nuevo valor `semanal_flexible`.

### Migracion SQL

```sql
ALTER TABLE tareas_plantillas DROP CONSTRAINT tareas_plantillas_frecuencia_check;
ALTER TABLE tareas_plantillas ADD CONSTRAINT tareas_plantillas_frecuencia_check 
  CHECK (frecuencia = ANY (ARRAY['diaria','semanal','mensual','manual','semanal_flexible']));
```

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| Nueva migracion SQL | Actualizar el CHECK constraint para incluir `semanal_flexible` |

No se requieren cambios en el codigo frontend ni en la edge function, ya que el unico problema es la restriccion en la base de datos.

