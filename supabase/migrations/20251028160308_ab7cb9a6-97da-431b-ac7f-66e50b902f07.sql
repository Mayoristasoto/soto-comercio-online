-- Corregir funciones de feriados añadiendo search_path para seguridad

CREATE OR REPLACE FUNCTION calcular_dias_laborales_antes(fecha_objetivo DATE, dias_laborales INT)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fecha_actual DATE;
  contador INT := 0;
BEGIN
  fecha_actual := fecha_objetivo;
  
  WHILE contador < dias_laborales LOOP
    fecha_actual := fecha_actual - INTERVAL '1 day';
    
    -- Verificar que no sea fin de semana
    IF EXTRACT(DOW FROM fecha_actual) NOT IN (0, 6) THEN
      -- Verificar que no sea feriado
      IF NOT EXISTS (
        SELECT 1 FROM dias_feriados
        WHERE fecha = fecha_actual AND activo = true
      ) THEN
        contador := contador + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN fecha_actual;
END;
$$;

CREATE OR REPLACE FUNCTION crear_tareas_feriados()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  feriado_rec RECORD;
  fecha_tarea DATE;
  gerente_rec RECORD;
  tarea_existente UUID;
BEGIN
  -- Buscar feriados activos en los próximos 30 días
  FOR feriado_rec IN 
    SELECT * FROM dias_feriados
    WHERE activo = true
      AND fecha >= CURRENT_DATE
      AND fecha <= CURRENT_DATE + INTERVAL '30 days'
  LOOP
    -- Calcular 3 días laborales antes
    fecha_tarea := calcular_dias_laborales_antes(feriado_rec.fecha, 3);
    
    -- Solo crear tareas si la fecha de tarea es hoy o futura
    IF fecha_tarea >= CURRENT_DATE THEN
      -- Para cada gerente de sucursal activo
      FOR gerente_rec IN
        SELECT DISTINCT e.id, e.sucursal_id
        FROM empleados e
        WHERE e.rol = 'gerente_sucursal'
          AND e.activo = true
          AND e.sucursal_id IS NOT NULL
      LOOP
        -- Verificar si ya existe una tarea para este gerente y feriado
        SELECT id INTO tarea_existente
        FROM tareas
        WHERE asignado_a = gerente_rec.id
          AND titulo LIKE '%' || feriado_rec.nombre || '%'
          AND fecha_limite = feriado_rec.fecha;
        
        -- Si no existe, crear la tarea
        IF tarea_existente IS NULL THEN
          INSERT INTO tareas (
            titulo,
            descripcion,
            asignado_a,
            asignado_por,
            prioridad,
            estado,
            fecha_limite
          ) VALUES (
            'Asignar personal para ' || feriado_rec.nombre,
            'Seleccione los empleados de su sucursal que trabajarán el día ' || 
            TO_CHAR(feriado_rec.fecha, 'DD/MM/YYYY') || ' (' || feriado_rec.nombre || '). ' ||
            COALESCE(feriado_rec.descripcion, ''),
            gerente_rec.id,
            NULL,
            'alta',
            'pendiente',
            feriado_rec.fecha
          );
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_crear_tareas_feriados()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM crear_tareas_feriados();
  RETURN NEW;
END;
$$;