
-- Corregir search_path para las funciones de feriados
CREATE OR REPLACE FUNCTION calcular_dias_laborables_antes(
  fecha_feriado DATE,
  dias_necesarios INTEGER DEFAULT 3
)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  fecha_actual DATE := fecha_feriado;
  dias_contados INTEGER := 0;
BEGIN
  WHILE dias_contados < dias_necesarios LOOP
    fecha_actual := fecha_actual - INTERVAL '1 day';
    
    -- Verificar que no sea fin de semana (sábado=6, domingo=0)
    -- Y que no sea otro feriado
    IF EXTRACT(DOW FROM fecha_actual) NOT IN (0, 6) 
       AND NOT EXISTS (
         SELECT 1 FROM dias_feriados 
         WHERE fecha = fecha_actual AND activo = true
       ) THEN
      dias_contados := dias_contados + 1;
    END IF;
  END LOOP;
  
  RETURN fecha_actual;
END;
$$;

CREATE OR REPLACE FUNCTION crear_tareas_asignacion_feriado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  gerente RECORD;
  fecha_limite DATE;
BEGIN
  -- Solo procesar si el feriado es nuevo y está activo
  IF TG_OP = 'INSERT' AND NEW.activo = true THEN
    -- Calcular fecha límite (3 días laborables antes)
    fecha_limite := calcular_dias_laborables_antes(NEW.fecha, 3);
    
    -- Crear tarea para cada gerente de sucursal activo
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
        'Asignar personal para ' || NEW.nombre,
        'Seleccione los empleados de su sucursal que trabajarán el día ' || 
        TO_CHAR(NEW.fecha, 'DD/MM/YYYY') || ' (' || NEW.nombre || '). ' ||
        'Debe completar esta asignación antes del ' || TO_CHAR(fecha_limite, 'DD/MM/YYYY') || '.',
        'urgente',
        'pendiente',
        fecha_limite
      );
    END LOOP;
    
    RAISE NOTICE 'Tareas de feriado creadas para fecha %', NEW.fecha;
  END IF;
  
  RETURN NEW;
END;
$$;
