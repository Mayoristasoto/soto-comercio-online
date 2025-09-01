-- Crear tabla de presupuesto de la empresa
CREATE TABLE public.presupuesto_empresa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  presupuesto_inicial NUMERIC(12,2) NOT NULL DEFAULT 0,
  presupuesto_disponible NUMERIC(12,2) NOT NULL DEFAULT 0,
  presupuesto_utilizado NUMERIC(12,2) NOT NULL DEFAULT 0,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(anio, mes)
);

-- Enable RLS
ALTER TABLE public.presupuesto_empresa ENABLE ROW LEVEL SECURITY;

-- Crear políticas para presupuesto
CREATE POLICY "Admins pueden gestionar presupuesto" 
ON public.presupuesto_empresa 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Crear función para actualizar presupuesto cuando se asigna un premio
CREATE OR REPLACE FUNCTION public.actualizar_presupuesto_premio()
RETURNS TRIGGER AS $$
DECLARE
  costo_premio NUMERIC(12,2);
  presupuesto_actual RECORD;
BEGIN
  -- Obtener el costo del premio
  SELECT monto_presupuestado INTO costo_premio
  FROM public.premios 
  WHERE id = NEW.premio_id;

  IF costo_premio IS NULL THEN
    costo_premio := 0;
  END IF;

  -- Si hay un costo real, usarlo en lugar del presupuestado
  IF NEW.costo_real IS NOT NULL THEN
    costo_premio := NEW.costo_real;
  END IF;

  -- Buscar el presupuesto del mes actual
  SELECT * INTO presupuesto_actual
  FROM public.presupuesto_empresa
  WHERE anio = EXTRACT(YEAR FROM NEW.fecha_asignacion)
    AND mes = EXTRACT(MONTH FROM NEW.fecha_asignacion)
    AND activo = true;

  -- Si no existe presupuesto para este mes, crearlo con valores por defecto
  IF NOT FOUND THEN
    INSERT INTO public.presupuesto_empresa (
      anio, mes, presupuesto_inicial, presupuesto_disponible, presupuesto_utilizado
    ) VALUES (
      EXTRACT(YEAR FROM NEW.fecha_asignacion),
      EXTRACT(MONTH FROM NEW.fecha_asignacion),
      100000, -- Presupuesto inicial por defecto
      100000 - costo_premio,
      costo_premio
    );
  ELSE
    -- Actualizar el presupuesto existente
    UPDATE public.presupuesto_empresa
    SET 
      presupuesto_disponible = presupuesto_disponible - costo_premio,
      presupuesto_utilizado = presupuesto_utilizado + costo_premio,
      updated_at = now()
    WHERE id = presupuesto_actual.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar presupuesto automáticamente
CREATE TRIGGER trigger_actualizar_presupuesto_premio
  AFTER INSERT ON public.asignaciones_premio
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_presupuesto_premio();

-- Crear función para obtener resumen de presupuesto
CREATE OR REPLACE FUNCTION public.get_presupuesto_resumen()
RETURNS TABLE(
  mes_actual NUMERIC(12,2),
  anual NUMERIC(12,2),
  disponible_mes NUMERIC(12,2),
  utilizado_mes NUMERIC(12,2),
  porcentaje_utilizado NUMERIC(5,2)
) 
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  WITH presupuesto_mes AS (
    SELECT 
      presupuesto_inicial,
      presupuesto_disponible,
      presupuesto_utilizado
    FROM public.presupuesto_empresa
    WHERE anio = EXTRACT(YEAR FROM CURRENT_DATE)
      AND mes = EXTRACT(MONTH FROM CURRENT_DATE)
      AND activo = true
    LIMIT 1
  ),
  presupuesto_anual AS (
    SELECT 
      COALESCE(SUM(presupuesto_inicial), 0) as total_anual,
      COALESCE(SUM(presupuesto_utilizado), 0) as utilizado_anual
    FROM public.presupuesto_empresa
    WHERE anio = EXTRACT(YEAR FROM CURRENT_DATE)
      AND activo = true
  )
  SELECT 
    COALESCE(pm.presupuesto_inicial, 0) as mes_actual,
    pa.total_anual as anual,
    COALESCE(pm.presupuesto_disponible, 0) as disponible_mes,
    COALESCE(pm.presupuesto_utilizado, 0) as utilizado_mes,
    CASE 
      WHEN COALESCE(pm.presupuesto_inicial, 0) > 0 
      THEN ROUND((COALESCE(pm.presupuesto_utilizado, 0) / pm.presupuesto_inicial) * 100, 2)
      ELSE 0
    END as porcentaje_utilizado
  FROM presupuesto_mes pm
  CROSS JOIN presupuesto_anual pa;
$$;

-- Insertar presupuesto inicial para el mes actual si no existe
INSERT INTO public.presupuesto_empresa (anio, mes, presupuesto_inicial, presupuesto_disponible, descripcion)
VALUES (
  EXTRACT(YEAR FROM CURRENT_DATE),
  EXTRACT(MONTH FROM CURRENT_DATE),
  100000,
  100000,
  'Presupuesto inicial del mes'
) ON CONFLICT (anio, mes) DO NOTHING;