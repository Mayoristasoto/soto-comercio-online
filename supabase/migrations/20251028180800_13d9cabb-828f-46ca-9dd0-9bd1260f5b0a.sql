
-- Crear tareas para feriados existentes que no tienen tareas asignadas
DO $$
DECLARE
  feriado RECORD;
  gerente RECORD;
  fecha_limite DATE;
BEGIN
  -- Buscar feriados sin tareas asignadas
  FOR feriado IN 
    SELECT * FROM dias_feriados 
    WHERE activo = true 
      AND fecha >= CURRENT_DATE
  LOOP
    -- Verificar que no existan tareas para este feriado
    IF NOT EXISTS (
      SELECT 1 FROM tareas 
      WHERE titulo = 'Asignar personal para ' || feriado.nombre
    ) THEN
      fecha_limite := calcular_dias_laborables_antes(feriado.fecha, 3);
      
      FOR gerente IN 
        SELECT id, nombre, apellido, sucursal_id
        FROM empleados
        WHERE rol = 'gerente_sucursal' 
          AND activo = true
          AND sucursal_id IS NOT NULL
      LOOP
        INSERT INTO tareas (
          asignado_a,
          titulo,
          descripcion,
          prioridad,
          estado,
          fecha_limite
        ) VALUES (
          gerente.id,
          'Asignar personal para ' || feriado.nombre,
          'Seleccione los empleados de su sucursal que trabajarán el día ' || 
          TO_CHAR(feriado.fecha, 'DD/MM/YYYY') || ' (' || feriado.nombre || '). ' ||
          'Debe completar esta asignación antes del ' || TO_CHAR(fecha_limite, 'DD/MM/YYYY') || '.',
          'urgente',
          'pendiente',
          fecha_limite
        );
        
        RAISE NOTICE 'Tarea creada para gerente % %', gerente.nombre, gerente.apellido;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;
