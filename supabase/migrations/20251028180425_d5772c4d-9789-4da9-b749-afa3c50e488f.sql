
-- Función para calcular días laborables hacia atrás (excluyendo fines de semana y feriados)
CREATE OR REPLACE FUNCTION calcular_dias_laborables_antes(
  fecha_feriado DATE,
  dias_necesarios INTEGER DEFAULT 3
)
RETURNS DATE
LANGUAGE plpgsql
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

-- Función para crear tareas de asignación de feriados a gerentes
CREATE OR REPLACE FUNCTION crear_tareas_asignacion_feriado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Crear trigger para ejecutar la función al insertar feriados
DROP TRIGGER IF EXISTS trigger_crear_tareas_feriado ON dias_feriados;
CREATE TRIGGER trigger_crear_tareas_feriado
  AFTER INSERT ON dias_feriados
  FOR EACH ROW
  EXECUTE FUNCTION crear_tareas_asignacion_feriado();

-- Crear las tareas para el feriado existente que no tiene tareas
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
      AND NOT EXISTS (
        SELECT 1 FROM tareas 
        WHERE titulo LIKE '%' || dias_feriados.nombre || '%'
      )
  LOOP
    fecha_limite := calcular_dias_laborables_antes(feriado.fecha, 3);
    
    FOR gerente IN 
      SELECT id, nombre, apellido
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
    END LOOP;
  END LOOP;
END;
$$;
