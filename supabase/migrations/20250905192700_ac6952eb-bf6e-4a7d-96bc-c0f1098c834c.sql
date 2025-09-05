-- Create capacitaciones table
CREATE TABLE public.capacitaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  duracion_estimada INTEGER, -- en minutos
  obligatoria BOOLEAN NOT NULL DEFAULT false,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create materiales_capacitacion table for file uploads
CREATE TABLE public.materiales_capacitacion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  capacitacion_id UUID NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'pdf', 'video', 'documento'
  url TEXT NOT NULL,
  tamaño_archivo BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create asignaciones_capacitacion table
CREATE TABLE public.asignaciones_capacitacion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  capacitacion_id UUID NOT NULL,
  empleado_id UUID NOT NULL,
  fecha_asignacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_completada TIMESTAMP WITH TIME ZONE,
  estado TEXT NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'en_progreso', 'completada', 'vencida'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create evaluaciones_capacitacion table
CREATE TABLE public.evaluaciones_capacitacion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  capacitacion_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  puntaje_minimo INTEGER NOT NULL DEFAULT 70, -- porcentaje mínimo para aprobar
  intentos_maximos INTEGER NOT NULL DEFAULT 3,
  tiempo_limite INTEGER, -- en minutos, null = sin límite
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create preguntas_evaluacion table
CREATE TABLE public.preguntas_evaluacion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluacion_id UUID NOT NULL,
  pregunta TEXT NOT NULL,
  opciones JSONB NOT NULL, -- array de opciones
  respuesta_correcta INTEGER NOT NULL, -- índice de la respuesta correcta
  puntos INTEGER NOT NULL DEFAULT 1,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create intentos_evaluacion table
CREATE TABLE public.intentos_evaluacion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluacion_id UUID NOT NULL,
  empleado_id UUID NOT NULL,
  respuestas JSONB NOT NULL, -- array con las respuestas del empleado
  puntaje_obtenido INTEGER NOT NULL,
  puntaje_total INTEGER NOT NULL,
  porcentaje NUMERIC(5,2) NOT NULL,
  aprobado BOOLEAN NOT NULL,
  tiempo_empleado INTEGER, -- en minutos
  fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_finalizacion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.capacitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiales_capacitacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_capacitacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones_capacitacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preguntas_evaluacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intentos_evaluacion ENABLE ROW LEVEL SECURITY;

-- RLS Policies for capacitaciones
CREATE POLICY "Usuarios autenticados pueden ver capacitaciones activas" 
ON public.capacitaciones 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND activa = true);

CREATE POLICY "Admins pueden gestionar capacitaciones" 
ON public.capacitaciones 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

-- RLS Policies for materiales_capacitacion
CREATE POLICY "Usuarios pueden ver materiales de capacitaciones asignadas" 
ON public.materiales_capacitacion 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  capacitacion_id IN (
    SELECT ac.capacitacion_id 
    FROM asignaciones_capacitacion ac 
    WHERE ac.empleado_id = get_current_empleado()
  )
);

CREATE POLICY "Admins pueden gestionar materiales" 
ON public.materiales_capacitacion 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

-- RLS Policies for asignaciones_capacitacion
CREATE POLICY "Empleados pueden ver sus propias asignaciones" 
ON public.asignaciones_capacitacion 
FOR SELECT 
USING (empleado_id = get_current_empleado());

CREATE POLICY "Empleados pueden actualizar sus asignaciones" 
ON public.asignaciones_capacitacion 
FOR UPDATE 
USING (empleado_id = get_current_empleado())
WITH CHECK (empleado_id = get_current_empleado());

CREATE POLICY "Admins pueden gestionar asignaciones" 
ON public.asignaciones_capacitacion 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

-- RLS Policies for evaluaciones_capacitacion
CREATE POLICY "Usuarios pueden ver evaluaciones de capacitaciones asignadas" 
ON public.evaluaciones_capacitacion 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  capacitacion_id IN (
    SELECT ac.capacitacion_id 
    FROM asignaciones_capacitacion ac 
    WHERE ac.empleado_id = get_current_empleado()
  )
);

CREATE POLICY "Admins pueden gestionar evaluaciones" 
ON public.evaluaciones_capacitacion 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

-- RLS Policies for preguntas_evaluacion
CREATE POLICY "Usuarios pueden ver preguntas de evaluaciones permitidas" 
ON public.preguntas_evaluacion 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  evaluacion_id IN (
    SELECT ec.id 
    FROM evaluaciones_capacitacion ec
    JOIN asignaciones_capacitacion ac ON ec.capacitacion_id = ac.capacitacion_id
    WHERE ac.empleado_id = get_current_empleado()
  )
);

CREATE POLICY "Admins pueden gestionar preguntas" 
ON public.preguntas_evaluacion 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

-- RLS Policies for intentos_evaluacion
CREATE POLICY "Empleados pueden ver sus propios intentos" 
ON public.intentos_evaluacion 
FOR SELECT 
USING (empleado_id = get_current_empleado());

CREATE POLICY "Empleados pueden crear intentos" 
ON public.intentos_evaluacion 
FOR INSERT 
WITH CHECK (empleado_id = get_current_empleado());

CREATE POLICY "Empleados pueden actualizar sus intentos" 
ON public.intentos_evaluacion 
FOR UPDATE 
USING (empleado_id = get_current_empleado())
WITH CHECK (empleado_id = get_current_empleado());

CREATE POLICY "Admins pueden ver todos los intentos" 
ON public.intentos_evaluacion 
FOR SELECT 
USING (is_admin());

-- Create storage bucket for training materials
INSERT INTO storage.buckets (id, name, public) VALUES ('training-materials', 'training-materials', false);

-- Create storage policies
CREATE POLICY "Authenticated users can view training materials" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'training-materials' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can upload training materials" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'training-materials' AND is_admin());

CREATE POLICY "Admins can update training materials" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'training-materials' AND is_admin());

CREATE POLICY "Admins can delete training materials" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'training-materials' AND is_admin());

-- Create triggers for updated_at
CREATE TRIGGER update_capacitaciones_updated_at
BEFORE UPDATE ON public.capacitaciones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asignaciones_capacitacion_updated_at
BEFORE UPDATE ON public.asignaciones_capacitacion
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluaciones_capacitacion_updated_at
BEFORE UPDATE ON public.evaluaciones_capacitacion
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();