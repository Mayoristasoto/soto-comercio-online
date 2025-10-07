-- Tabla para configuración de ventanas de tiempo para solicitudes
CREATE TABLE IF NOT EXISTS public.solicitudes_configuracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_solicitud TEXT NOT NULL CHECK (tipo_solicitud IN ('dia_medico', 'adelanto_sueldo', 'vacaciones', 'permiso')),
  dias_anticipacion INTEGER NOT NULL DEFAULT 1,
  fecha_inicio_ventana DATE,
  fecha_fin_ventana DATE,
  monto_maximo_mes NUMERIC(12,2),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tipo_solicitud)
);

-- Tabla principal de solicitudes
CREATE TABLE IF NOT EXISTS public.solicitudes_generales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  tipo_solicitud TEXT NOT NULL CHECK (tipo_solicitud IN ('dia_medico', 'adelanto_sueldo', 'permiso')),
  fecha_solicitud DATE NOT NULL,
  monto NUMERIC(12,2),
  descripcion TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  aprobado_por UUID REFERENCES public.empleados(id),
  fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  comentarios_aprobacion TEXT,
  archivo_adjunto TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_solicitudes_generales_empleado ON public.solicitudes_generales(empleado_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_generales_estado ON public.solicitudes_generales(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_generales_tipo ON public.solicitudes_generales(tipo_solicitud);
CREATE INDEX IF NOT EXISTS idx_solicitudes_generales_fecha ON public.solicitudes_generales(fecha_solicitud);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_solicitudes_configuracion_updated_at
  BEFORE UPDATE ON public.solicitudes_configuracion
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_solicitudes_generales_updated_at
  BEFORE UPDATE ON public.solicitudes_generales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies para solicitudes_configuracion
ALTER TABLE public.solicitudes_configuracion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin puede gestionar configuración de solicitudes"
  ON public.solicitudes_configuracion FOR ALL
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

CREATE POLICY "Todos pueden ver configuración activa"
  ON public.solicitudes_configuracion FOR SELECT
  USING (activo = true AND auth.uid() IS NOT NULL);

-- RLS Policies para solicitudes_generales
ALTER TABLE public.solicitudes_generales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empleados pueden crear sus solicitudes"
  ON public.solicitudes_generales FOR INSERT
  WITH CHECK (empleado_id = get_current_empleado());

CREATE POLICY "Empleados pueden ver sus propias solicitudes"
  ON public.solicitudes_generales FOR SELECT
  USING (empleado_id = get_current_empleado());

CREATE POLICY "Empleados pueden actualizar sus solicitudes pendientes"
  ON public.solicitudes_generales FOR UPDATE
  USING (empleado_id = get_current_empleado() AND estado = 'pendiente');

CREATE POLICY "Admin puede ver todas las solicitudes"
  ON public.solicitudes_generales FOR SELECT
  USING (current_user_is_admin());

CREATE POLICY "Admin puede gestionar todas las solicitudes"
  ON public.solicitudes_generales FOR ALL
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- Insertar configuraciones por defecto
INSERT INTO public.solicitudes_configuracion (tipo_solicitud, dias_anticipacion, monto_maximo_mes)
VALUES 
  ('dia_medico', 0, NULL),
  ('adelanto_sueldo', 3, 50000.00),
  ('permiso', 1, NULL)
ON CONFLICT (tipo_solicitud) DO NOTHING;