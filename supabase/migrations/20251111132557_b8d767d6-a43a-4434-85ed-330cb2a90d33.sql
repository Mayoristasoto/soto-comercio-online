-- Tabla para trackear el progreso de onboarding de empleados
CREATE TABLE IF NOT EXISTS public.empleado_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_completado TIMESTAMP WITH TIME ZONE,
  
  -- Checklist de tareas de onboarding
  cambio_password_completado BOOLEAN NOT NULL DEFAULT false,
  perfil_completado BOOLEAN NOT NULL DEFAULT false,
  documentos_firmados BOOLEAN NOT NULL DEFAULT false,
  primera_capacitacion BOOLEAN NOT NULL DEFAULT false,
  primera_tarea_completada BOOLEAN NOT NULL DEFAULT false,
  foto_facial_subida BOOLEAN NOT NULL DEFAULT false,
  tour_completado BOOLEAN NOT NULL DEFAULT false,
  entregas_confirmadas BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  porcentaje_completado INTEGER NOT NULL DEFAULT 0,
  ultima_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notas TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(empleado_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_empleado_onboarding_empleado ON public.empleado_onboarding(empleado_id);
CREATE INDEX idx_empleado_onboarding_completado ON public.empleado_onboarding(fecha_completado);
CREATE INDEX idx_empleado_onboarding_porcentaje ON public.empleado_onboarding(porcentaje_completado);

-- Habilitar RLS
ALTER TABLE public.empleado_onboarding ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Los empleados solo ven su propio onboarding
CREATE POLICY "Empleados pueden ver su propio onboarding"
  ON public.empleado_onboarding
  FOR SELECT
  USING (
    empleado_id IN (
      SELECT id FROM public.empleados WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Empleados pueden actualizar su propio onboarding"
  ON public.empleado_onboarding
  FOR UPDATE
  USING (
    empleado_id IN (
      SELECT id FROM public.empleados WHERE user_id = auth.uid()
    )
  );

-- Administradores pueden ver y gestionar todo
CREATE POLICY "Administradores pueden ver todo el onboarding"
  ON public.empleado_onboarding
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.empleados e
      WHERE e.user_id = auth.uid()
      AND e.rol = 'admin_rrhh'::user_role
    )
  );

CREATE POLICY "Administradores pueden insertar onboarding"
  ON public.empleado_onboarding
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.empleados e
      WHERE e.user_id = auth.uid()
      AND e.rol = 'admin_rrhh'::user_role
    )
  );

CREATE POLICY "Administradores pueden actualizar onboarding"
  ON public.empleado_onboarding
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.empleados e
      WHERE e.user_id = auth.uid()
      AND e.rol = 'admin_rrhh'::user_role
    )
  );

-- Trigger para actualizar el porcentaje automáticamente
CREATE OR REPLACE FUNCTION public.calcular_porcentaje_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_tareas INTEGER := 8;
  tareas_completadas INTEGER := 0;
BEGIN
  -- Contar tareas completadas
  IF NEW.cambio_password_completado THEN tareas_completadas := tareas_completadas + 1; END IF;
  IF NEW.perfil_completado THEN tareas_completadas := tareas_completadas + 1; END IF;
  IF NEW.documentos_firmados THEN tareas_completadas := tareas_completadas + 1; END IF;
  IF NEW.primera_capacitacion THEN tareas_completadas := tareas_completadas + 1; END IF;
  IF NEW.primera_tarea_completada THEN tareas_completadas := tareas_completadas + 1; END IF;
  IF NEW.foto_facial_subida THEN tareas_completadas := tareas_completadas + 1; END IF;
  IF NEW.tour_completado THEN tareas_completadas := tareas_completadas + 1; END IF;
  IF NEW.entregas_confirmadas THEN tareas_completadas := tareas_completadas + 1; END IF;
  
  -- Calcular porcentaje
  NEW.porcentaje_completado := (tareas_completadas * 100) / total_tareas;
  NEW.ultima_actualizacion := now();
  
  -- Si llega al 100%, marcar como completado
  IF NEW.porcentaje_completado = 100 AND NEW.fecha_completado IS NULL THEN
    NEW.fecha_completado := now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_calcular_porcentaje_onboarding
  BEFORE INSERT OR UPDATE ON public.empleado_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.calcular_porcentaje_onboarding();

-- Trigger para actualizar updated_at
CREATE TRIGGER update_empleado_onboarding_updated_at
  BEFORE UPDATE ON public.empleado_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Función para inicializar onboarding automáticamente cuando se crea un empleado
CREATE OR REPLACE FUNCTION public.inicializar_onboarding_empleado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Crear registro de onboarding para el nuevo empleado
  INSERT INTO public.empleado_onboarding (empleado_id)
  VALUES (NEW.id)
  ON CONFLICT (empleado_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger para inicializar onboarding cuando se crea un empleado
CREATE TRIGGER trigger_inicializar_onboarding
  AFTER INSERT ON public.empleados
  FOR EACH ROW
  EXECUTE FUNCTION public.inicializar_onboarding_empleado();