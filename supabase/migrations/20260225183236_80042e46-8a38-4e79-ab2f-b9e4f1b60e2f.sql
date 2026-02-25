
-- RPC: kiosk_solicitar_vacaciones (SECURITY DEFINER to bypass RLS for kiosk)
CREATE OR REPLACE FUNCTION public.kiosk_solicitar_vacaciones(
  p_empleado_id UUID,
  p_fecha_inicio TEXT,
  p_fecha_fin TEXT,
  p_motivo TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bloqueo RECORD;
  v_conflicto RECORD;
  v_emp RECORD;
BEGIN
  -- Validate employee
  SELECT id, puesto, sucursal_id, activo INTO v_emp
  FROM empleados WHERE id = p_empleado_id;
  IF NOT FOUND OR NOT v_emp.activo THEN
    RETURN jsonb_build_object('success', false, 'error', 'Empleado no encontrado o inactivo');
  END IF;

  -- Check blocks
  SELECT motivo INTO v_bloqueo FROM vacaciones_bloqueos
  WHERE activo = true
    AND fecha_inicio <= p_fecha_fin::date
    AND fecha_fin >= p_fecha_inicio::date
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Periodo bloqueado: ' || v_bloqueo.motivo);
  END IF;

  -- Check approved conflicts (same role + branch)
  IF v_emp.puesto IS NOT NULL AND v_emp.sucursal_id IS NOT NULL THEN
    SELECT sv.id INTO v_conflicto FROM solicitudes_vacaciones sv
    JOIN empleados e ON e.id = sv.empleado_id
    WHERE sv.empleado_id != p_empleado_id
      AND sv.estado = 'aprobada'
      AND sv.fecha_inicio <= p_fecha_fin::date
      AND sv.fecha_fin >= p_fecha_inicio::date
      AND e.puesto = v_emp.puesto
      AND e.sucursal_id = v_emp.sucursal_id
    LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Ya existe una solicitud aprobada en tu puesto y sucursal para estas fechas');
    END IF;
  END IF;

  -- Insert
  INSERT INTO solicitudes_vacaciones (empleado_id, fecha_inicio, fecha_fin, motivo, estado)
  VALUES (p_empleado_id, p_fecha_inicio::date, p_fecha_fin::date, p_motivo, 'pendiente');

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: kiosk_check_vacaciones_conflictos (SECURITY DEFINER to bypass RLS for kiosk)
CREATE OR REPLACE FUNCTION public.kiosk_check_vacaciones_conflictos(
  p_empleado_id UUID,
  p_fecha_inicio TEXT,
  p_fecha_fin TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emp RECORD;
  v_result JSONB;
  v_aprobadas JSONB;
  v_pendientes JSONB;
BEGIN
  -- Get employee info
  SELECT puesto, sucursal_id INTO v_emp
  FROM empleados WHERE id = p_empleado_id AND activo = true;
  IF NOT FOUND OR v_emp.puesto IS NULL OR v_emp.sucursal_id IS NULL THEN
    RETURN jsonb_build_object('has_conflict', false, 'has_warning', false);
  END IF;

  -- Get approved conflicts
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'nombre', e.nombre || ' ' || e.apellido,
    'estado', sv.estado
  )), '[]'::jsonb) INTO v_aprobadas
  FROM solicitudes_vacaciones sv
  JOIN empleados e ON e.id = sv.empleado_id
  WHERE sv.empleado_id != p_empleado_id
    AND sv.estado = 'aprobada'
    AND sv.fecha_inicio <= p_fecha_fin::date
    AND sv.fecha_fin >= p_fecha_inicio::date
    AND e.puesto = v_emp.puesto
    AND e.sucursal_id = v_emp.sucursal_id;

  -- Get pending conflicts
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'nombre', e.nombre || ' ' || e.apellido,
    'estado', sv.estado
  )), '[]'::jsonb) INTO v_pendientes
  FROM solicitudes_vacaciones sv
  JOIN empleados e ON e.id = sv.empleado_id
  WHERE sv.empleado_id != p_empleado_id
    AND sv.estado = 'pendiente'
    AND sv.fecha_inicio <= p_fecha_fin::date
    AND sv.fecha_fin >= p_fecha_inicio::date
    AND e.puesto = v_emp.puesto
    AND e.sucursal_id = v_emp.sucursal_id;

  RETURN jsonb_build_object(
    'has_conflict', jsonb_array_length(v_aprobadas) > 0,
    'has_warning', jsonb_array_length(v_pendientes) > 0,
    'aprobadas', v_aprobadas,
    'pendientes', v_pendientes
  );
END;
$$;
