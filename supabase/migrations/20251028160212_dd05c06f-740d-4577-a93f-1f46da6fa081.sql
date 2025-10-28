-- Crear tabla de días feriados
CREATE TABLE dias_feriados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para empleados asignados a trabajar en feriados
CREATE TABLE feriado_empleados_asignados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feriado_id UUID NOT NULL REFERENCES dias_feriados(id) ON DELETE CASCADE,
  sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  asignado_por UUID REFERENCES empleados(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(feriado_id, empleado_id)
);

-- Crear índices
CREATE INDEX idx_dias_feriados_fecha ON dias_feriados(fecha);
CREATE INDEX idx_feriado_empleados_feriado ON feriado_empleados_asignados(feriado_id);
CREATE INDEX idx_feriado_empleados_sucursal ON feriado_empleados_asignados(sucursal_id);

-- Enable RLS
ALTER TABLE dias_feriados ENABLE ROW LEVEL SECURITY;
ALTER TABLE feriado_empleados_asignados ENABLE ROW LEVEL SECURITY;

-- Policies para dias_feriados
CREATE POLICY "Admin puede gestionar feriados"
  ON dias_feriados FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol = 'admin_rrhh'
        AND e.activo = true
    )
  );

CREATE POLICY "Todos pueden ver feriados activos"
  ON dias_feriados FOR SELECT
  USING (auth.uid() IS NOT NULL AND activo = true);

-- Policies para feriado_empleados_asignados
CREATE POLICY "Admin puede ver todas las asignaciones"
  ON feriado_empleados_asignados FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol = 'admin_rrhh'
        AND e.activo = true
    )
  );

CREATE POLICY "Gerentes pueden gestionar asignaciones de su sucursal"
  ON feriado_empleados_asignados FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol = 'gerente_sucursal'
        AND e.sucursal_id = feriado_empleados_asignados.sucursal_id
        AND e.activo = true
    )
  );

CREATE POLICY "Empleados pueden ver sus propias asignaciones"
  ON feriado_empleados_asignados FOR SELECT
  USING (empleado_id = get_current_empleado());

-- Función para calcular días laborales hacia atrás
CREATE OR REPLACE FUNCTION calcular_dias_laborales_antes(fecha_objetivo DATE, dias_laborales INT)
RETURNS DATE
LANGUAGE plpgsql
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

-- Función para crear tareas automáticas para gerentes sobre feriados
CREATE OR REPLACE FUNCTION crear_tareas_feriados()
RETURNS void
LANGUAGE plpgsql
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

-- Trigger para ejecutar la función cuando se inserta o actualiza un feriado
CREATE OR REPLACE FUNCTION trigger_crear_tareas_feriados()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM crear_tareas_feriados();
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_feriado_insert_update
  AFTER INSERT OR UPDATE ON dias_feriados
  FOR EACH ROW
  WHEN (NEW.activo = true)
  EXECUTE FUNCTION trigger_crear_tareas_feriados();