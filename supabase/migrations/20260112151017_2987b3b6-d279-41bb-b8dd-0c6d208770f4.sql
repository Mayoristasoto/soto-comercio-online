-- Función para delegación masiva de tareas
CREATE OR REPLACE FUNCTION public.delegacion_masiva_tareas(
  p_tarea_ids uuid[],
  p_empleado_destino_id uuid,
  p_delegado_por uuid,
  p_comentarios text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tarea_id uuid;
  v_tarea record;
  v_count integer := 0;
  v_errors text[] := '{}';
BEGIN
  -- Validar que hay tareas
  IF array_length(p_tarea_ids, 1) IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No se proporcionaron tareas');
  END IF;

  -- Validar empleado destino existe y está activo
  IF NOT EXISTS (SELECT 1 FROM empleados WHERE id = p_empleado_destino_id AND activo = true) THEN
    RETURN json_build_object('success', false, 'error', 'Empleado destino no encontrado o inactivo');
  END IF;

  -- Procesar cada tarea
  FOREACH v_tarea_id IN ARRAY p_tarea_ids
  LOOP
    BEGIN
      -- Obtener datos de la tarea
      SELECT * INTO v_tarea FROM tareas WHERE id = v_tarea_id;
      
      IF v_tarea IS NULL THEN
        v_errors := array_append(v_errors, 'Tarea ' || v_tarea_id || ' no encontrada');
        CONTINUE;
      END IF;

      -- Actualizar la tarea
      UPDATE tareas 
      SET 
        asignado_a = p_empleado_destino_id,
        updated_at = now()
      WHERE id = v_tarea_id;

      -- Registrar en historial
      INSERT INTO tareas_historial (
        tarea_id,
        accion,
        empleado_id,
        detalles
      ) VALUES (
        v_tarea_id,
        'delegacion_masiva',
        p_delegado_por,
        json_build_object(
          'empleado_anterior_id', v_tarea.asignado_a,
          'empleado_nuevo_id', p_empleado_destino_id,
          'comentarios', p_comentarios
        )
      );

      -- Crear notificación para el nuevo asignado
      INSERT INTO notificaciones (
        empleado_id,
        tipo,
        titulo,
        mensaje,
        datos
      ) VALUES (
        p_empleado_destino_id,
        'tarea_delegada',
        'Nueva tarea asignada',
        'Se te ha delegado la tarea: ' || v_tarea.titulo,
        json_build_object(
          'tarea_id', v_tarea_id,
          'delegado_por', p_delegado_por
        )
      );

      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Error en tarea ' || v_tarea_id || ': ' || SQLERRM);
    END;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'delegadas', v_count,
    'total', array_length(p_tarea_ids, 1),
    'errors', v_errors
  );
END;
$$;

-- Tabla para plantillas de tareas recurrentes
CREATE TABLE IF NOT EXISTS public.tareas_plantillas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descripcion text,
  prioridad text DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  categoria_id uuid REFERENCES tareas_categorias(id) ON DELETE SET NULL,
  dias_limite_default integer DEFAULT 7,
  asignar_a_rol text,
  frecuencia text DEFAULT 'manual' CHECK (frecuencia IN ('diaria', 'semanal', 'mensual', 'manual')),
  activa boolean DEFAULT true,
  created_by uuid REFERENCES empleados(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.tareas_plantillas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para plantillas
CREATE POLICY "Admins y gerentes pueden ver plantillas" 
ON public.tareas_plantillas 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM empleados 
    WHERE user_id = auth.uid() 
    AND rol IN ('admin_rrhh', 'gerente_sucursal')
  )
);

CREATE POLICY "Admins pueden gestionar plantillas" 
ON public.tareas_plantillas 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM empleados 
    WHERE user_id = auth.uid() 
    AND rol = 'admin_rrhh'
  )
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_tareas_plantillas_activa ON tareas_plantillas(activa);
CREATE INDEX IF NOT EXISTS idx_tareas_plantillas_frecuencia ON tareas_plantillas(frecuencia);

-- Vista para carga de trabajo de empleados
CREATE OR REPLACE VIEW public.empleados_carga_trabajo AS
SELECT 
  e.id,
  e.nombre,
  e.apellido,
  e.rol,
  e.sucursal_id,
  s.nombre as sucursal_nombre,
  COUNT(t.id) FILTER (WHERE t.estado = 'pendiente') as tareas_pendientes,
  COUNT(t.id) FILTER (WHERE t.estado = 'en_progreso') as tareas_en_progreso,
  COUNT(t.id) FILTER (WHERE t.estado = 'completada' AND t.updated_at > now() - interval '7 days') as tareas_completadas_semana,
  COUNT(t.id) FILTER (WHERE t.fecha_limite < now() AND t.estado NOT IN ('completada', 'cancelada')) as tareas_vencidas,
  COUNT(t.id) FILTER (WHERE t.fecha_limite BETWEEN now() AND now() + interval '24 hours' AND t.estado NOT IN ('completada', 'cancelada')) as tareas_proximas_vencer
FROM empleados e
LEFT JOIN sucursales s ON s.id = e.sucursal_id
LEFT JOIN tareas t ON t.asignado_a = e.id
WHERE e.activo = true
GROUP BY e.id, e.nombre, e.apellido, e.rol, e.sucursal_id, s.nombre;

-- Dar acceso a la vista
GRANT SELECT ON public.empleados_carga_trabajo TO authenticated;