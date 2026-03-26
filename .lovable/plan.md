

## Plan: Reemplazar asignaciones de limpieza

### Operación
1. **DELETE** todas las filas actuales de `limpieza_asignaciones` (18 registros)
2. **INSERT** 18 nuevas asignaciones según la tabla de arriba

### SQL (via insert tool, no migración)

```sql
-- Paso 1: Borrar todo
DELETE FROM limpieza_asignaciones;

-- Paso 2: Insertar nuevas (dia_semana: 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb)
INSERT INTO limpieza_asignaciones (dia_semana, empleado_id, zona, activo) VALUES
-- Lunes
(1, '39571dd7-94f3-4fa5-84fc-ea6baadc8eec', 'Cocina', true),
(1, '39571dd7-94f3-4fa5-84fc-ea6baadc8eec', 'Baño Mujeres', true),
(1, '9871bc34-120f-42a8-a214-5d34a516d7f6', 'Baño Hombres', true),
-- Martes
(2, '9871bc34-120f-42a8-a214-5d34a516d7f6', 'Cocina', true),
(2, '5d23025c-613f-4774-8e63-f5c80a0acaa3', 'Baño Hombres', true),
(2, 'dc830459-0aa7-4bbe-99f2-9f1080a60b3e', 'Baño Mujeres', true),
-- Miércoles
(3, '5d23025c-613f-4774-8e63-f5c80a0acaa3', 'Cocina', true),
(3, '0da05020-7cb1-42f5-a8cd-02ffaff0f512', 'Baño Mujeres', true),
(3, '54278134-59d7-4ac8-abd1-6bc906e871b3', 'Baño Hombres', true),
-- Jueves
(4, 'dc830459-0aa7-4bbe-99f2-9f1080a60b3e', 'Cocina', true),
(4, '105996f4-9ad6-47b3-9da6-a8a544fb4228', 'Baño Mujeres', true),
(4, '08f7d06e-c871-4ff1-b0de-681aaea90d33', 'Baño Hombres', true),
-- Viernes
(5, '0da05020-7cb1-42f5-a8cd-02ffaff0f512', 'Cocina', true),
(5, '9871bc34-120f-42a8-a214-5d34a516d7f6', 'Baño Hombres', true),
(5, 'dc830459-0aa7-4bbe-99f2-9f1080a60b3e', 'Baño Mujeres', true),
-- Sábado
(6, '54278134-59d7-4ac8-abd1-6bc906e871b3', 'Cocina', true),
(6, '0da05020-7cb1-42f5-a8cd-02ffaff0f512', 'Baño Mujeres', true),
(6, '08f7d06e-c871-4ff1-b0de-681aaea90d33', 'Baño Hombres', true);
```

### Notas
- Solo operaciones de datos (DELETE + INSERT), sin cambios de esquema
- Se ejecuta via insert tool (no migración)
- Los comodines Marina y Daniel no se cargan como asignación fija
- El switch maestro en Tareas seguirá funcionando igual

### Archivos modificados
Ninguno. Solo datos en BD.

