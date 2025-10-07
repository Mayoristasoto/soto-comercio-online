-- Tabla de bloqueos de fechas (solo admin puede gestionar)
CREATE TABLE IF NOT EXISTS public.vacaciones_bloqueos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  motivo TEXT NOT NULL,
  creado_por UUID REFERENCES public.empleados(id),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT bloqueo_fechas_validas CHECK (fecha_fin >= fecha_inicio)
);

-- Tabla de saldo de vacaciones por empleado
CREATE TABLE IF NOT EXISTS public.vacaciones_saldo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  anio INTEGER NOT NULL,
  dias_acumulados NUMERIC(5,2) NOT NULL DEFAULT 0,
  dias_usados NUMERIC(5,2) NOT NULL DEFAULT 0,
  dias_pendientes NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empleado_id, anio)
);

-- Enable RLS
ALTER TABLE public.vacaciones_bloqueos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacaciones_saldo ENABLE ROW LEVEL SECURITY;

-- RLS Policies para vacaciones_bloqueos
CREATE POLICY "Todos pueden ver bloqueos activos"
ON public.vacaciones_bloqueos
FOR SELECT
USING (activo = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Solo admin puede gestionar bloqueos"
ON public.vacaciones_bloqueos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid()
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid()
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
);

-- RLS Policies para vacaciones_saldo
CREATE POLICY "Empleados pueden ver su propio saldo"
ON public.vacaciones_saldo
FOR SELECT
USING (empleado_id = get_current_empleado());

CREATE POLICY "Gerentes pueden ver saldo de su sucursal"
ON public.vacaciones_saldo
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM empleados e1
    JOIN empleados e2 ON e1.sucursal_id = e2.sucursal_id
    WHERE e1.user_id = auth.uid()
    AND e1.rol = 'gerente_sucursal'
    AND e1.activo = true
    AND e2.id = vacaciones_saldo.empleado_id
  )
);

CREATE POLICY "Admin puede ver todos los saldos"
ON public.vacaciones_saldo
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid()
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
);

CREATE POLICY "Admin puede gestionar saldos"
ON public.vacaciones_saldo
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid()
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid()
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_vacaciones_saldo_updated_at
BEFORE UPDATE ON public.vacaciones_saldo
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Función para calcular días hábiles
CREATE OR REPLACE FUNCTION public.calcular_dias_habiles(fecha_inicio DATE, fecha_fin DATE)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  dias INTEGER := 0;
  fecha_actual DATE := fecha_inicio;
BEGIN
  WHILE fecha_actual <= fecha_fin LOOP
    IF EXTRACT(DOW FROM fecha_actual) NOT IN (0, 6) THEN
      dias := dias + 1;
    END IF;
    fecha_actual := fecha_actual + 1;
  END LOOP;
  RETURN dias;
END;
$$;

-- Función para calcular saldo de vacaciones según antigüedad
CREATE OR REPLACE FUNCTION public.calcular_saldo_vacaciones(p_empleado_id UUID, p_anio INTEGER)
RETURNS NUMERIC(5,2)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fecha_ingreso DATE;
  meses_trabajados INTEGER;
  dias_por_mes NUMERIC(5,2) := 1.25; -- Configurable
  saldo NUMERIC(5,2);
BEGIN
  SELECT e.fecha_ingreso INTO fecha_ingreso
  FROM empleados e
  WHERE e.id = p_empleado_id;
  
  IF fecha_ingreso IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calcular meses trabajados hasta fin del año especificado
  meses_trabajados := EXTRACT(YEAR FROM AGE(
    MAKE_DATE(p_anio, 12, 31),
    fecha_ingreso
  )) * 12 + EXTRACT(MONTH FROM AGE(
    MAKE_DATE(p_anio, 12, 31),
    fecha_ingreso
  ));
  
  IF meses_trabajados < 0 THEN
    RETURN 0;
  END IF;
  
  saldo := meses_trabajados * dias_por_mes;
  
  RETURN ROUND(saldo, 2);
END;
$$;