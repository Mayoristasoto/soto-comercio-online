-- Crear tabla de documentos obligatorios
CREATE TABLE public.documentos_obligatorios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  contenido TEXT,
  url_archivo TEXT,
  tipo_documento TEXT NOT NULL DEFAULT 'procedimiento',
  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_vigencia_desde DATE,
  fecha_vigencia_hasta DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de asignaciones de documentos obligatorios
CREATE TABLE public.asignaciones_documentos_obligatorios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  documento_id UUID NOT NULL,
  empleado_id UUID NOT NULL,
  fecha_asignacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_limite_lectura DATE,
  asignado_por UUID,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(documento_id, empleado_id)
);

-- Crear tabla de confirmaciones de lectura
CREATE TABLE public.confirmaciones_lectura (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asignacion_id UUID NOT NULL,
  empleado_id UUID NOT NULL,
  documento_id UUID NOT NULL,
  fecha_confirmacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_confirmacion INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.documentos_obligatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_documentos_obligatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confirmaciones_lectura ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para documentos_obligatorios
CREATE POLICY "Admins pueden gestionar documentos obligatorios"
ON public.documentos_obligatorios
FOR ALL
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

CREATE POLICY "Empleados pueden ver documentos activos asignados"
ON public.documentos_obligatorios
FOR SELECT
TO authenticated
USING (
  activo = true AND 
  id IN (
    SELECT documento_id 
    FROM public.asignaciones_documentos_obligatorios 
    WHERE empleado_id = get_current_empleado() AND activa = true
  )
);

-- Políticas RLS para asignaciones_documentos_obligatorios
CREATE POLICY "Admins pueden gestionar asignaciones"
ON public.asignaciones_documentos_obligatorios
FOR ALL
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

CREATE POLICY "Empleados pueden ver sus asignaciones"
ON public.asignaciones_documentos_obligatorios
FOR SELECT
TO authenticated
USING (empleado_id = get_current_empleado());

-- Políticas RLS para confirmaciones_lectura
CREATE POLICY "Admins pueden ver todas las confirmaciones"
ON public.confirmaciones_lectura
FOR SELECT
TO authenticated
USING (current_user_is_admin());

CREATE POLICY "Empleados pueden crear sus confirmaciones"
ON public.confirmaciones_lectura
FOR INSERT
TO authenticated
WITH CHECK (empleado_id = get_current_empleado());

CREATE POLICY "Empleados pueden ver sus confirmaciones"
ON public.confirmaciones_lectura
FOR SELECT
TO authenticated
USING (empleado_id = get_current_empleado());

-- Triggers para updated_at
CREATE TRIGGER update_documentos_obligatorios_updated_at
BEFORE UPDATE ON public.documentos_obligatorios
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_asignaciones_documentos_obligatorios_updated_at
BEFORE UPDATE ON public.asignaciones_documentos_obligatorios
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();