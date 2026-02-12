ALTER TABLE tareas_plantillas DROP CONSTRAINT tareas_plantillas_frecuencia_check;
ALTER TABLE tareas_plantillas ADD CONSTRAINT tareas_plantillas_frecuencia_check 
  CHECK (frecuencia = ANY (ARRAY['diaria','semanal','mensual','manual','semanal_flexible']));