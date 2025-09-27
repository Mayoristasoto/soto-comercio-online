-- Función para evaluar puntualidad mensual y asignar insignia automáticamente
CREATE OR REPLACE FUNCTION public.evaluar_puntualidad_mensual()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    empleado_record RECORD;
    fecha_inicio DATE;
    fecha_fin DATE;
    total_dias_trabajados INTEGER;
    dias_puntuales INTEGER;
    dias_requeridos INTEGER;
    insignia_puntual_id UUID;
    ya_tiene_insignia BOOLEAN;
BEGIN
    -- Obtener el mes anterior (para evaluar mes completado)
    fecha_inicio := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');
    fecha_fin := DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day';
    
    -- Obtener la insignia de empleado puntual
    SELECT id INTO insignia_puntual_id
    FROM insignias 
    WHERE nombre = 'Empleado Puntual' 
    AND activa = true;
    
    IF insignia_puntual_id IS NULL THEN
        RAISE LOG 'No se encontró insignia de Empleado Puntual activa';
        RETURN;
    END IF;
    
    -- Evaluar cada empleado activo
    FOR empleado_record IN 
        SELECT e.id, e.nombre, e.apellido, e.user_id
        FROM empleados e
        WHERE e.activo = true
    LOOP
        -- Verificar si ya tiene la insignia del mes anterior
        SELECT EXISTS(
            SELECT 1 FROM insignias_empleado ie
            WHERE ie.empleado_id = empleado_record.id
            AND ie.insignia_id = insignia_puntual_id
            AND DATE_TRUNC('month', ie.fecha_otorgada) = fecha_inicio
        ) INTO ya_tiene_insignia;
        
        IF ya_tiene_insignia THEN
            CONTINUE; -- Ya tiene la insignia de este mes
        END IF;
        
        -- Contar total de días que debería haber trabajado en el mes
        SELECT COUNT(DISTINCT DATE(f.timestamp_real)) INTO total_dias_trabajados
        FROM fichajes f
        WHERE f.empleado_id = empleado_record.id
        AND f.tipo = 'entrada'
        AND f.estado = 'valido'
        AND DATE(f.timestamp_real) BETWEEN fecha_inicio AND fecha_fin;
        
        -- Verificar que trabajó al menos 15 días en el mes (mínimo para evaluar)
        IF total_dias_trabajados < 15 THEN
            CONTINUE;
        END IF;
        
        -- Contar días puntuales (llegó antes o a tiempo según su turno)
        SELECT COUNT(*) INTO dias_puntuales
        FROM (
            SELECT DISTINCT DATE(f.timestamp_real) as fecha_fichaje
            FROM fichajes f
            JOIN empleado_turnos et ON et.empleado_id = f.empleado_id
            JOIN fichado_turnos ft ON ft.id = et.turno_id
            WHERE f.empleado_id = empleado_record.id
            AND f.tipo = 'entrada'
            AND f.estado = 'valido'
            AND DATE(f.timestamp_real) BETWEEN fecha_inicio AND fecha_fin
            AND et.activo = true
            AND ft.activo = true
            -- Verificar que llegó antes o a tiempo (incluyendo tolerancia)
            AND EXTRACT(EPOCH FROM (
                f.timestamp_real::TIME - 
                (ft.hora_entrada + COALESCE(ft.tolerancia_entrada_minutos, 0) * INTERVAL '1 minute')
            )) <= 0
            -- Asegurar que el turno estaba vigente en esa fecha
            AND (et.fecha_inicio IS NULL OR et.fecha_inicio <= DATE(f.timestamp_real))
            AND (et.fecha_fin IS NULL OR et.fecha_fin >= DATE(f.timestamp_real))
        ) dias_puntuales_query;
        
        -- Verificar si cumple el criterio de puntualidad perfecta (100% de días puntuales)
        IF dias_puntuales = total_dias_trabajados AND total_dias_trabajados >= 15 THEN
            -- Asignar la insignia
            INSERT INTO insignias_empleado (empleado_id, insignia_id, fecha_otorgada)
            VALUES (empleado_record.id, insignia_puntual_id, fecha_fin);
            
            -- Log del evento
            RAISE LOG 'Insignia Empleado Puntual asignada a % % por % días puntuales de % trabajados en mes %-%', 
                empleado_record.nombre, empleado_record.apellido, 
                dias_puntuales, total_dias_trabajados,
                EXTRACT(YEAR FROM fecha_inicio), EXTRACT(MONTH FROM fecha_inicio);
                
            -- También podríamos notificar al empleado aquí
            -- (insertando en tabla de notificaciones si existe)
        ELSE
            RAISE LOG 'Empleado % % no califica: % días puntuales de % trabajados', 
                empleado_record.nombre, empleado_record.apellido,
                dias_puntuales, total_dias_trabajados;
        END IF;
    END LOOP;
    
END;
$$;

-- Función para trigger automático cuando se registra un fichaje
CREATE OR REPLACE FUNCTION public.verificar_puntualidad_diaria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    es_puntual BOOLEAN := false;
    turno_record RECORD;
BEGIN
    -- Solo procesar fichajes de entrada válidos
    IF NEW.tipo != 'entrada' OR NEW.estado != 'valido' THEN
        RETURN NEW;
    END IF;
    
    -- Obtener el turno del empleado para este día
    SELECT ft.hora_entrada, ft.tolerancia_entrada_minutos
    INTO turno_record
    FROM empleado_turnos et
    JOIN fichado_turnos ft ON ft.id = et.turno_id
    WHERE et.empleado_id = NEW.empleado_id
    AND et.activo = true
    AND ft.activo = true
    AND (et.fecha_inicio IS NULL OR et.fecha_inicio <= DATE(NEW.timestamp_real))
    AND (et.fecha_fin IS NULL OR et.fecha_fin >= DATE(NEW.timestamp_real))
    LIMIT 1;
    
    -- Si no hay turno asignado, marcar como puntual por defecto
    IF NOT FOUND THEN
        es_puntual := true;
    ELSE
        -- Verificar si llegó a tiempo (antes o durante la tolerancia)
        es_puntual := EXTRACT(EPOCH FROM (
            NEW.timestamp_real::TIME - 
            (turno_record.hora_entrada + COALESCE(turno_record.tolerancia_entrada_minutos, 0) * INTERVAL '1 minute')
        )) <= 0;
    END IF;
    
    -- Actualizar metadatos del fichaje con información de puntualidad
    NEW.datos_adicionales := COALESCE(NEW.datos_adicionales, '{}'::jsonb) || 
        jsonb_build_object(
            'es_puntual', es_puntual,
            'hora_esperada', turno_record.hora_entrada,
            'tolerancia_minutos', COALESCE(turno_record.tolerancia_entrada_minutos, 0)
        );
    
    RETURN NEW;
END;
$$;

-- Crear trigger para verificación automática de puntualidad
DROP TRIGGER IF EXISTS trigger_verificar_puntualidad ON fichajes;
CREATE TRIGGER trigger_verificar_puntualidad
    BEFORE INSERT OR UPDATE ON fichajes
    FOR EACH ROW
    EXECUTE FUNCTION verificar_puntualidad_diaria();

-- Función helper para obtener estadísticas de puntualidad de un empleado
CREATE OR REPLACE FUNCTION public.get_estadisticas_puntualidad(
    p_empleado_id UUID,
    p_fecha_inicio DATE DEFAULT NULL,
    p_fecha_fin DATE DEFAULT NULL
)
RETURNS TABLE(
    total_dias INTEGER,
    dias_puntuales INTEGER,
    porcentaje_puntualidad NUMERIC,
    puede_obtener_insignia BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Usar mes actual si no se especifican fechas
    IF p_fecha_inicio IS NULL THEN
        p_fecha_inicio := DATE_TRUNC('month', CURRENT_DATE);
    END IF;
    
    IF p_fecha_fin IS NULL THEN
        p_fecha_fin := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day';
    END IF;
    
    RETURN QUERY
    WITH estadisticas AS (
        SELECT 
            COUNT(DISTINCT DATE(f.timestamp_real))::INTEGER as total,
            COUNT(DISTINCT CASE 
                WHEN (f.datos_adicionales->>'es_puntual')::boolean = true 
                THEN DATE(f.timestamp_real) 
            END)::INTEGER as puntuales
        FROM fichajes f
        WHERE f.empleado_id = p_empleado_id
        AND f.tipo = 'entrada'
        AND f.estado = 'valido'
        AND DATE(f.timestamp_real) BETWEEN p_fecha_inicio AND p_fecha_fin
    )
    SELECT 
        e.total,
        e.puntuales,
        CASE 
            WHEN e.total > 0 THEN ROUND((e.puntuales::NUMERIC / e.total::NUMERIC) * 100, 2)
            ELSE 0
        END as porcentaje,
        (e.total >= 15 AND e.puntuales = e.total) as puede_insignia
    FROM estadisticas e;
END;
$$;