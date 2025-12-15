-- Tabla para plantillas de trabajo semanal
CREATE TABLE public.plantillas_trabajo_semanal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activa BOOLEAN NOT NULL DEFAULT true,
  creado_por UUID REFERENCES public.empleados(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Detalle de cada plantilla (asignaciones por día)
CREATE TABLE public.plantilla_trabajo_detalle (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plantilla_id UUID NOT NULL REFERENCES public.plantillas_trabajo_semanal(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id),
  sucursal_id UUID NOT NULL REFERENCES public.sucursales(id),
  dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6), -- 0=Domingo, 1=Lunes...6=Sábado
  hora_entrada TIME NOT NULL,
  hora_salida TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Planificación semanal real (instancia de una semana específica)
CREATE TABLE public.planificacion_semanal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha_inicio_semana DATE NOT NULL, -- Lunes de la semana
  plantilla_base_id UUID REFERENCES public.plantillas_trabajo_semanal(id),
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'confirmado', 'enviado')),
  notas TEXT,
  creado_por UUID REFERENCES public.empleados(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(fecha_inicio_semana)
);

-- Detalle de planificación semanal
CREATE TABLE public.planificacion_semanal_detalle (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  planificacion_id UUID NOT NULL REFERENCES public.planificacion_semanal(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id),
  sucursal_id UUID NOT NULL REFERENCES public.sucursales(id),
  dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
  hora_entrada TIME NOT NULL,
  hora_salida TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_plantilla_detalle_plantilla ON public.plantilla_trabajo_detalle(plantilla_id);
CREATE INDEX idx_plantilla_detalle_empleado ON public.plantilla_trabajo_detalle(empleado_id);
CREATE INDEX idx_planificacion_detalle_planificacion ON public.planificacion_semanal_detalle(planificacion_id);
CREATE INDEX idx_planificacion_detalle_empleado ON public.planificacion_semanal_detalle(empleado_id);
CREATE INDEX idx_planificacion_semanal_fecha ON public.planificacion_semanal(fecha_inicio_semana);

-- RLS
ALTER TABLE public.plantillas_trabajo_semanal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantilla_trabajo_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planificacion_semanal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planificacion_semanal_detalle ENABLE ROW LEVEL SECURITY;

-- Políticas para plantillas
CREATE POLICY "Admin puede gestionar plantillas trabajo"
ON public.plantillas_trabajo_semanal FOR ALL
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

CREATE POLICY "Gerentes pueden ver plantillas"
ON public.plantillas_trabajo_semanal FOR SELECT
USING (EXISTS (
  SELECT 1 FROM empleados e 
  WHERE e.user_id = auth.uid() 
  AND e.rol IN ('admin_rrhh', 'gerente_sucursal') 
  AND e.activo = true
));

-- Políticas para detalle plantillas
CREATE POLICY "Admin puede gestionar detalle plantillas"
ON public.plantilla_trabajo_detalle FOR ALL
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

CREATE POLICY "Gerentes pueden ver detalle plantillas"
ON public.plantilla_trabajo_detalle FOR SELECT
USING (EXISTS (
  SELECT 1 FROM empleados e 
  WHERE e.user_id = auth.uid() 
  AND e.rol IN ('admin_rrhh', 'gerente_sucursal') 
  AND e.activo = true
));

-- Políticas para planificación semanal
CREATE POLICY "Admin puede gestionar planificacion"
ON public.planificacion_semanal FOR ALL
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

CREATE POLICY "Gerentes pueden ver planificacion"
ON public.planificacion_semanal FOR SELECT
USING (EXISTS (
  SELECT 1 FROM empleados e 
  WHERE e.user_id = auth.uid() 
  AND e.rol IN ('admin_rrhh', 'gerente_sucursal') 
  AND e.activo = true
));

-- Políticas para detalle planificación
CREATE POLICY "Admin puede gestionar detalle planificacion"
ON public.planificacion_semanal_detalle FOR ALL
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

CREATE POLICY "Gerentes pueden ver detalle planificacion"
ON public.planificacion_semanal_detalle FOR SELECT
USING (EXISTS (
  SELECT 1 FROM empleados e 
  WHERE e.user_id = auth.uid() 
  AND e.rol IN ('admin_rrhh', 'gerente_sucursal') 
  AND e.activo = true
));

-- Trigger para updated_at
CREATE TRIGGER update_plantillas_trabajo_updated_at
BEFORE UPDATE ON public.plantillas_trabajo_semanal
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planificacion_semanal_updated_at
BEFORE UPDATE ON public.planificacion_semanal
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();