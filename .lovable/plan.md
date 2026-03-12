

## Plan: Importar esquema de limpieza a `limpieza_asignaciones`

### Acción

Ejecutar un INSERT masivo en `limpieza_asignaciones` con las 16 asignaciones fijas extraídas del cuadro. Los comodines (Marina y Daniel) no se cargan como asignación fija ya que solo cubren ausencias.

### SQL Migration

```sql
INSERT INTO public.limpieza_asignaciones (dia_semana, empleado_id, zona, activo) VALUES
-- Lunes (1)
(1, '56cf495f-41ca-4615-8a57-05d62c429c9c', 'Cocina', true),
(1, '0da05020-7cb1-42f5-a8cd-02ffaff0f512', 'Baño Mujeres', true),
(1, '0da05020-7cb1-42f5-a8cd-02ffaff0f512', 'Baño Hombres', true),
-- Martes (2)
(2, '0da05020-7cb1-42f5-a8cd-02ffaff0f512', 'Cocina', true),
(2, 'b29bbea0-40a1-4a57-a322-c816ed527bc8', 'Baño Mujeres', true),
(2, 'b29bbea0-40a1-4a57-a322-c816ed527bc8', 'Baño Hombres', true),
-- Miércoles (3)
(3, 'b29bbea0-40a1-4a57-a322-c816ed527bc8', 'Cocina', true),
(3, '7f1fc94b-b452-4eff-a8b5-709398f857c1', 'Baño Mujeres', true),
(3, '7f1fc94b-b452-4eff-a8b5-709398f857c1', 'Baño Hombres', true),
-- Jueves (4)
(4, '7f1fc94b-b452-4eff-a8b5-709398f857c1', 'Cocina', true),
(4, '39571dd7-94f3-4fa5-84fc-ea6baadc8eec', 'Baño Mujeres', true),
(4, '39571dd7-94f3-4fa5-84fc-ea6baadc8eec', 'Baño Hombres', true),
-- Viernes (5)
(5, '39571dd7-94f3-4fa5-84fc-ea6baadc8eec', 'Cocina', true),
(5, '56cf495f-41ca-4615-8a57-05d62c429c9c', 'Baño Mujeres', true),
(5, '56cf495f-41ca-4615-8a57-05d62c429c9c', 'Baño Hombres', true),
-- Sábado (6)
(6, '5d23025c-613f-4774-8e63-f5c80a0acaa3', 'Cocina', true),
(6, '5d23025c-613f-4774-8e63-f5c80a0acaa3', 'Baño Mujeres', true),
(6, '5d23025c-613f-4774-8e63-f5c80a0acaa3', 'Baño Hombres', true);
```

### Notas
- `dia_semana`: 0=Domingo, 1=Lunes ... 6=Sábado (consistente con JS `getDay()`)
- No se incluye `sucursal_id` por ahora (se puede asignar después desde el panel admin)
- Los comodines Marina y Daniel no se insertan; se asignarán manualmente cuando corresponda desde la pestaña Limpieza en Tareas

### Archivos
Solo una migración SQL. Sin cambios de código.

