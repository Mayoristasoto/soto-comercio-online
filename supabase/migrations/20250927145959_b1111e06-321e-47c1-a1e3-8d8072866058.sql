-- Create table for tracking late arrivals
CREATE TABLE public.fichajes_tardios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL,
  fecha_fichaje DATE NOT NULL,
  hora_programada TIME NOT NULL,
  hora_real TIME NOT NULL,
  minutos_retraso INTEGER NOT NULL,
  justificado BOOLEAN DEFAULT false,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Foreign key constraints
  CONSTRAINT fk_fichajes_tardios_empleado 
    FOREIGN KEY (empleado_id) 
    REFERENCES public.empleados(id) 
    ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.fichajes_tardios ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Empleados pueden ver sus propios retrasos" 
ON public.fichajes_tardios 
FOR SELECT 
USING (empleado_id = get_current_empleado());

CREATE POLICY "Admins pueden gestionar todos los retrasos" 
ON public.fichajes_tardios 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh' 
    AND e.activo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh' 
    AND e.activo = true
  )
);

-- Create function to automatically detect and record late arrivals
CREATE OR REPLACE FUNCTION public.detectar_fichaje_tardio()
RETURNS TRIGGER AS $$
DECLARE
  turno_empleado RECORD;
  minutos_tarde INTEGER;
BEGIN
  -- Only process entrada type fichajes
  IF NEW.tipo != 'entrada' THEN
    RETURN NEW;
  END IF;

  -- Get employee's shift for today
  SELECT 
    ft.hora_entrada,
    ft.tolerancia_entrada_minutos
  INTO turno_empleado
  FROM public.empleado_turnos et
  JOIN public.fichado_turnos ft ON et.turno_id = ft.id
  WHERE et.empleado_id = NEW.empleado_id
    AND et.activo = true
    AND ft.activo = true
    AND (et.fecha_fin IS NULL OR et.fecha_fin >= CURRENT_DATE)
    AND et.fecha_inicio <= CURRENT_DATE
  LIMIT 1;

  -- If no shift found, skip processing
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Calculate minutes late
  minutos_tarde := EXTRACT(EPOCH FROM (
    NEW.timestamp_real::TIME - 
    (turno_empleado.hora_entrada + COALESCE(turno_empleado.tolerancia_entrada_minutos, 0) * INTERVAL '1 minute')
  )) / 60;

  -- If employee is late, record it
  IF minutos_tarde > 0 THEN
    INSERT INTO public.fichajes_tardios (
      empleado_id,
      fecha_fichaje,
      hora_programada,
      hora_real,
      minutos_retraso
    ) VALUES (
      NEW.empleado_id,
      NEW.timestamp_real::DATE,
      turno_empleado.hora_entrada,
      NEW.timestamp_real::TIME,
      minutos_tarde
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to detect late arrivals automatically
CREATE TRIGGER trigger_detectar_fichaje_tardio
  AFTER INSERT ON public.fichajes
  FOR EACH ROW
  EXECUTE FUNCTION public.detectar_fichaje_tardio();

-- Create indexes for better performance
CREATE INDEX idx_fichajes_tardios_empleado_fecha 
ON public.fichajes_tardios(empleado_id, fecha_fichaje);

CREATE INDEX idx_fichajes_tardios_fecha 
ON public.fichajes_tardios(fecha_fichaje);

-- Update trigger for updated_at
CREATE TRIGGER update_fichajes_tardios_updated_at
  BEFORE UPDATE ON public.fichajes_tardios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();