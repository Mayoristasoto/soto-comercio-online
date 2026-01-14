-- Función para obtener tareas pendientes de un empleado (para uso en kiosco)
CREATE OR REPLACE FUNCTION kiosk_get_tareas(p_empleado_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  descripcion TEXT,
  prioridad TEXT,
  estado TEXT,
  fecha_limite DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.titulo,
    t.descripcion,
    t.prioridad::TEXT,
    t.estado::TEXT,
    t.fecha_limite
  FROM tareas t
  WHERE t.asignado_a = p_empleado_id
    AND t.estado IN ('pendiente', 'en_progreso')
  ORDER BY 
    CASE t.prioridad 
      WHEN 'urgente' THEN 1 
      WHEN 'alta' THEN 2 
      WHEN 'media' THEN 3 
      WHEN 'baja' THEN 4 
    END,
    t.fecha_limite ASC NULLS LAST
  LIMIT p_limit;
END;
$$;

-- Función para obtener tareas que vencen hoy (para alertas en kiosco)
CREATE OR REPLACE FUNCTION kiosk_get_tareas_vencen_hoy(p_empleado_id UUID)
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  descripcion TEXT,
  prioridad TEXT,
  fecha_limite DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.titulo,
    t.descripcion,
    t.prioridad::TEXT,
    t.fecha_limite
  FROM tareas t
  WHERE t.asignado_a = p_empleado_id
    AND t.estado = 'pendiente'
    AND t.fecha_limite = CURRENT_DATE
  ORDER BY 
    CASE t.prioridad 
      WHEN 'urgente' THEN 1 
      WHEN 'alta' THEN 2 
      WHEN 'media' THEN 3 
      WHEN 'baja' THEN 4 
    END;
END;
$$;

-- Otorgar permisos para que usuarios anónimos puedan ejecutar estas funciones
GRANT EXECUTE ON FUNCTION kiosk_get_tareas(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION kiosk_get_tareas_vencen_hoy(UUID) TO anon, authenticated;