-- Crear tipos enum primero
CREATE TYPE public.solicitud_estado AS ENUM (
  'pendiente',
  'aprobada', 
  'rechazada',
  'cancelada'
);

CREATE TYPE public.tarea_prioridad AS ENUM ('baja', 'media', 'alta', 'urgente');
CREATE TYPE public.tarea_estado AS ENUM ('pendiente', 'en_progreso', 'completada', 'cancelada');

-- Crear tabla para solicitudes de vacaciones
CREATE TABLE public.solicitudes_vacaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  motivo TEXT,
  estado solicitud_estado NOT NULL DEFAULT 'pendiente',
  aprobado_por UUID,
  fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  comentarios_aprobacion TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para tareas asignadas a empleados
CREATE TABLE public.tareas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  asignado_a UUID NOT NULL,
  asignado_por UUID,
  prioridad tarea_prioridad NOT NULL DEFAULT 'media',
  estado tarea_estado NOT NULL DEFAULT 'pendiente',
  fecha_limite DATE,
  fecha_completada TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en ambas tablas
ALTER TABLE public.solicitudes_vacaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para solicitudes_vacaciones
CREATE POLICY "Empleados pueden ver sus propias solicitudes de vacaciones" 
ON public.solicitudes_vacaciones 
FOR SELECT 
USING (empleado_id = get_current_empleado());

CREATE POLICY "Empleados pueden crear sus solicitudes de vacaciones" 
ON public.solicitudes_vacaciones 
FOR INSERT 
WITH CHECK (empleado_id = get_current_empleado());

CREATE POLICY "Empleados pueden actualizar sus solicitudes pendientes" 
ON public.solicitudes_vacaciones 
FOR UPDATE 
USING (empleado_id = get_current_empleado() AND estado = 'pendiente');

CREATE POLICY "Admins pueden gestionar todas las solicitudes" 
ON public.solicitudes_vacaciones 
FOR ALL 
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Políticas RLS para tareas
CREATE POLICY "Empleados pueden ver sus tareas asignadas" 
ON public.tareas 
FOR SELECT 
USING (asignado_a = get_current_empleado());

CREATE POLICY "Empleados pueden actualizar estado de sus tareas" 
ON public.tareas 
FOR UPDATE 
USING (asignado_a = get_current_empleado())
WITH CHECK (asignado_a = get_current_empleado());

CREATE POLICY "Admins pueden gestionar todas las tareas" 
ON public.tareas 
FOR ALL 
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Trigger para actualizar updated_at
CREATE TRIGGER update_solicitudes_vacaciones_updated_at
BEFORE UPDATE ON public.solicitudes_vacaciones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tareas_updated_at
BEFORE UPDATE ON public.tareas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();