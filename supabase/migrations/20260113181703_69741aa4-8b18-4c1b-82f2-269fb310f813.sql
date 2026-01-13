-- Tarea de prueba para verificar diálogo de salida
INSERT INTO tareas (titulo, descripcion, asignado_a, asignado_por, prioridad, estado, fecha_limite)
VALUES (
  'Tarea de prueba - Verificar diálogo salida',
  'Esta tarea es para probar que el diálogo de confirmación aparece al hacer salida en el kiosco',
  '96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4',
  '96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4',
  'media',
  'pendiente',
  CURRENT_DATE
);

-- Plantillas de tareas diarias
INSERT INTO tareas_plantillas (titulo, descripcion, prioridad, categoria_id, frecuencia, dias_limite_default, activa, created_by)
VALUES 
  ('Apagado de luces', 'Verificar que todas las luces estén apagadas al cierre de la sucursal', 'alta', '414f4d67-5c1d-453a-bec4-cfdf5782b5c1', 'diaria', 0, true, '96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4'),
  ('Reposición exhibidor cigarrillos', 'Reponer el stock del exhibidor de cigarrillos en caja', 'media', '414f4d67-5c1d-453a-bec4-cfdf5782b5c1', 'diaria', 0, true, '96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4'),
  ('Revisión de cajas registradoras', 'Verificar cierre correcto y arqueo de todas las cajas', 'alta', '414f4d67-5c1d-453a-bec4-cfdf5782b5c1', 'diaria', 0, true, '96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4'),
  ('Limpieza de área de trabajo', 'Mantener el área de trabajo ordenada y limpia', 'baja', '414f4d67-5c1d-453a-bec4-cfdf5782b5c1', 'diaria', 0, true, '96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4');