-- Tabla para categorías de tareas
CREATE TABLE IF NOT EXISTS public.tareas_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  color TEXT DEFAULT '#6366f1',
  icono TEXT DEFAULT 'folder',
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar categorías por defecto
INSERT INTO public.tareas_categorias (nombre, descripcion, color, icono) VALUES
  ('General', 'Tareas generales sin categoría específica', '#6366f1', 'folder'),
  ('Operaciones', 'Tareas operativas del día a día', '#f59e0b', 'settings'),
  ('RRHH', 'Tareas relacionadas con recursos humanos', '#10b981', 'users'),
  ('Capacitación', 'Tareas de formación y entrenamiento', '#3b82f6', 'graduation-cap'),
  ('Documentación', 'Tareas de gestión documental', '#8b5cf6', 'file-text'),
  ('Feriados', 'Asignación de personal para feriados', '#ef4444', 'calendar')
ON CONFLICT (nombre) DO NOTHING;

-- Agregar columna categoria_id a tareas
ALTER TABLE public.tareas 
ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.tareas_categorias(id);

-- Tabla para historial de delegaciones
CREATE TABLE IF NOT EXISTS public.tareas_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  accion TEXT NOT NULL, -- 'creada', 'delegada', 'estado_cambiado', 'completada'
  empleado_origen_id UUID REFERENCES public.empleados(id),
  empleado_destino_id UUID REFERENCES public.empleados(id),
  realizado_por UUID NOT NULL REFERENCES public.empleados(id),
  estado_anterior TEXT,
  estado_nuevo TEXT,
  comentarios TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_tareas_historial_tarea_id ON public.tareas_historial(tarea_id);
CREATE INDEX IF NOT EXISTS idx_tareas_historial_empleado_origen ON public.tareas_historial(empleado_origen_id);
CREATE INDEX IF NOT EXISTS idx_tareas_historial_empleado_destino ON public.tareas_historial(empleado_destino_id);
CREATE INDEX IF NOT EXISTS idx_tareas_categoria ON public.tareas(categoria_id);

-- Enable RLS
ALTER TABLE public.tareas_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas_historial ENABLE ROW LEVEL SECURITY;

-- Políticas para tareas_categorias (todos pueden ver, solo admin puede modificar)
CREATE POLICY "Authenticated users can view categories"
ON public.tareas_categorias FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.tareas_categorias FOR ALL
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Políticas para tareas_historial
CREATE POLICY "Users can view history of their tasks"
ON public.tareas_historial FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tareas t 
    WHERE t.id = tarea_id 
    AND (t.asignado_a = get_current_empleado() OR t.asignado_por = get_current_empleado())
  )
  OR is_admin_or_manager()
);

CREATE POLICY "Admins and managers can insert history"
ON public.tareas_historial FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_manager() OR realizado_por = get_current_empleado());

-- Trigger para updated_at en categorías
CREATE TRIGGER update_tareas_categorias_updated_at
  BEFORE UPDATE ON public.tareas_categorias
  FOR EACH ROW
  EXECUTE FUNCTION update_notificaciones_updated_at();

-- Función para registrar delegación y notificar
CREATE OR REPLACE FUNCTION public.registrar_delegacion_tarea(
  p_tarea_id UUID,
  p_empleado_destino_id UUID,
  p_comentarios TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tarea RECORD;
  v_current_empleado UUID;
  v_historial_id UUID;
  v_empleado_destino RECORD;
BEGIN
  v_current_empleado := get_current_empleado();
  
  -- Obtener información de la tarea actual
  SELECT * INTO v_tarea FROM tareas WHERE id = p_tarea_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tarea no encontrada';
  END IF;
  
  -- Obtener información del empleado destino
  SELECT nombre, apellido INTO v_empleado_destino 
  FROM empleados WHERE id = p_empleado_destino_id;
  
  -- Registrar en historial
  INSERT INTO tareas_historial (
    tarea_id, accion, empleado_origen_id, empleado_destino_id, 
    realizado_por, estado_anterior, estado_nuevo, comentarios, metadata
  ) VALUES (
    p_tarea_id, 'delegada', v_tarea.asignado_a, p_empleado_destino_id,
    v_current_empleado, v_tarea.estado, 'pendiente', p_comentarios,
    jsonb_build_object('titulo_tarea', v_tarea.titulo, 'prioridad', v_tarea.prioridad)
  ) RETURNING id INTO v_historial_id;
  
  -- Actualizar la tarea
  UPDATE tareas SET 
    asignado_a = p_empleado_destino_id,
    estado = 'pendiente',
    updated_at = now()
  WHERE id = p_tarea_id;
  
  -- Crear notificación para el empleado destino
  INSERT INTO notificaciones (
    usuario_id, titulo, mensaje, tipo, metadata
  ) VALUES (
    p_empleado_destino_id,
    'Nueva tarea asignada',
    'Se te ha delegado la tarea: ' || v_tarea.titulo,
    'tarea_delegada',
    jsonb_build_object(
      'tarea_id', p_tarea_id,
      'delegado_por', v_current_empleado,
      'prioridad', v_tarea.prioridad
    )
  );
  
  RETURN v_historial_id;
END;
$$;