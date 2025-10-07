-- Crear tabla de conceptos de evaluación
CREATE TABLE public.evaluaciones_conceptos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de evaluaciones mensuales
CREATE TABLE public.evaluaciones_mensuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  evaluador_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  anio INTEGER NOT NULL CHECK (anio >= 2020),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completada')),
  fecha_completada TIMESTAMP WITH TIME ZONE,
  observaciones TEXT,
  puntuacion_promedio NUMERIC(4,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empleado_id, mes, anio)
);

-- Crear tabla de detalles de evaluación (puntuaciones por concepto)
CREATE TABLE public.evaluaciones_detalles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id UUID NOT NULL REFERENCES public.evaluaciones_mensuales(id) ON DELETE CASCADE,
  concepto_id UUID NOT NULL REFERENCES public.evaluaciones_conceptos(id) ON DELETE CASCADE,
  puntuacion INTEGER NOT NULL CHECK (puntuacion >= 1 AND puntuacion <= 10),
  comentario TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(evaluacion_id, concepto_id)
);

-- Enable RLS
ALTER TABLE public.evaluaciones_conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones_mensuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones_detalles ENABLE ROW LEVEL SECURITY;

-- RLS Policies para evaluaciones_conceptos
CREATE POLICY "Admin y gerentes pueden ver conceptos activos"
ON public.evaluaciones_conceptos
FOR SELECT
USING (
  activo = true AND (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid() 
      AND e.rol IN ('admin_rrhh', 'gerente_sucursal')
      AND e.activo = true
    )
  )
);

CREATE POLICY "Admin puede gestionar conceptos"
ON public.evaluaciones_conceptos
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

-- RLS Policies para evaluaciones_mensuales
CREATE POLICY "Admin puede ver todas las evaluaciones"
ON public.evaluaciones_mensuales
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
);

CREATE POLICY "Gerentes pueden ver evaluaciones de su sucursal"
ON public.evaluaciones_mensuales
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM empleados e1
    JOIN empleados e2 ON e1.sucursal_id = e2.sucursal_id
    WHERE e1.user_id = auth.uid() 
    AND e1.rol = 'gerente_sucursal'
    AND e1.activo = true
    AND e2.id = evaluaciones_mensuales.empleado_id
  )
);

CREATE POLICY "Empleados pueden ver sus propias evaluaciones"
ON public.evaluaciones_mensuales
FOR SELECT
USING (empleado_id = get_current_empleado());

CREATE POLICY "Gerentes pueden crear evaluaciones de su sucursal"
ON public.evaluaciones_mensuales
FOR INSERT
WITH CHECK (
  evaluador_id = get_current_empleado() AND
  EXISTS (
    SELECT 1 FROM empleados e1
    JOIN empleados e2 ON e1.sucursal_id = e2.sucursal_id
    WHERE e1.id = get_current_empleado()
    AND e1.rol = 'gerente_sucursal'
    AND e1.activo = true
    AND e2.id = evaluaciones_mensuales.empleado_id
  )
);

CREATE POLICY "Gerentes pueden actualizar sus evaluaciones pendientes"
ON public.evaluaciones_mensuales
FOR UPDATE
USING (
  evaluador_id = get_current_empleado() AND
  estado = 'pendiente'
)
WITH CHECK (
  evaluador_id = get_current_empleado()
);

CREATE POLICY "Admin puede gestionar todas las evaluaciones"
ON public.evaluaciones_mensuales
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

-- RLS Policies para evaluaciones_detalles
CREATE POLICY "Detalles visibles con evaluación"
ON public.evaluaciones_detalles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM evaluaciones_mensuales em
    WHERE em.id = evaluaciones_detalles.evaluacion_id
  )
);

CREATE POLICY "Gerentes pueden crear detalles de sus evaluaciones"
ON public.evaluaciones_detalles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM evaluaciones_mensuales em
    WHERE em.id = evaluaciones_detalles.evaluacion_id
    AND em.evaluador_id = get_current_empleado()
    AND em.estado = 'pendiente'
  )
);

CREATE POLICY "Gerentes pueden actualizar detalles de evaluaciones pendientes"
ON public.evaluaciones_detalles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM evaluaciones_mensuales em
    WHERE em.id = evaluaciones_detalles.evaluacion_id
    AND em.evaluador_id = get_current_empleado()
    AND em.estado = 'pendiente'
  )
);

CREATE POLICY "Admin puede gestionar todos los detalles"
ON public.evaluaciones_detalles
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

-- Insertar conceptos de evaluación por defecto
INSERT INTO public.evaluaciones_conceptos (nombre, descripcion, orden) VALUES
('Puntualidad', 'Cumplimiento de horarios y asistencia', 1),
('Desempeño', 'Calidad y eficiencia en las tareas asignadas', 2),
('Trabajo en equipo', 'Colaboración y cooperación con compañeros', 3),
('Iniciativa', 'Proactividad y propuesta de mejoras', 4),
('Comunicación', 'Claridad y efectividad en la comunicación', 5),
('Cumplimiento de objetivos', 'Logro de metas establecidas', 6),
('Actitud', 'Disposición y compromiso con el trabajo', 7),
('Conocimientos técnicos', 'Dominio de habilidades requeridas para el puesto', 8);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_evaluaciones_conceptos_updated_at
BEFORE UPDATE ON public.evaluaciones_conceptos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluaciones_mensuales_updated_at
BEFORE UPDATE ON public.evaluaciones_mensuales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Función para calcular promedio automáticamente
CREATE OR REPLACE FUNCTION public.calcular_promedio_evaluacion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  promedio NUMERIC(4,2);
BEGIN
  SELECT AVG(puntuacion)::NUMERIC(4,2)
  INTO promedio
  FROM evaluaciones_detalles
  WHERE evaluacion_id = COALESCE(NEW.evaluacion_id, OLD.evaluacion_id);
  
  UPDATE evaluaciones_mensuales
  SET puntuacion_promedio = promedio
  WHERE id = COALESCE(NEW.evaluacion_id, OLD.evaluacion_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger para calcular promedio al insertar/actualizar/eliminar detalles
CREATE TRIGGER trigger_calcular_promedio_insert
AFTER INSERT ON public.evaluaciones_detalles
FOR EACH ROW EXECUTE FUNCTION public.calcular_promedio_evaluacion();

CREATE TRIGGER trigger_calcular_promedio_update
AFTER UPDATE ON public.evaluaciones_detalles
FOR EACH ROW EXECUTE FUNCTION public.calcular_promedio_evaluacion();

CREATE TRIGGER trigger_calcular_promedio_delete
AFTER DELETE ON public.evaluaciones_detalles
FOR EACH ROW EXECUTE FUNCTION public.calcular_promedio_evaluacion();