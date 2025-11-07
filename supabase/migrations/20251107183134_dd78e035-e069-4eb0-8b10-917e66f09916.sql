-- Crear tabla de configuración para el módulo de tareas
CREATE TABLE IF NOT EXISTS public.tareas_configuracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmar_tareas_al_salir BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.tareas_configuracion ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden ver configuración de tareas"
ON public.tareas_configuracion
FOR SELECT
TO authenticated
USING (true);

-- Política para permitir actualización solo a admin_rrhh
CREATE POLICY "Solo admin_rrhh puede actualizar configuración de tareas"
ON public.tareas_configuracion
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.empleados
    WHERE empleados.user_id = auth.uid()
    AND empleados.rol = 'admin_rrhh'
  )
);

-- Insertar configuración por defecto si no existe
INSERT INTO public.tareas_configuracion (confirmar_tareas_al_salir)
VALUES (false)
ON CONFLICT DO NOTHING;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_tareas_configuracion_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tareas_configuracion_updated_at
BEFORE UPDATE ON public.tareas_configuracion
FOR EACH ROW
EXECUTE FUNCTION public.update_tareas_configuracion_updated_at();