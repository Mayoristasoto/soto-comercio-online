-- Función para calcular días de vacaciones según Ley Argentina (Art. 150 LCT)
CREATE OR REPLACE FUNCTION calcular_vacaciones_ley_argentina(
  p_empleado_id UUID,
  p_anio INTEGER
) RETURNS NUMERIC AS $$
DECLARE
  v_fecha_ingreso DATE;
  v_fecha_calculo DATE;
  v_antiguedad_anios INTEGER;
  v_antiguedad_meses INTEGER;
  v_dias_trabajados INTEGER;
  v_dias_vacaciones NUMERIC;
BEGIN
  -- Obtener fecha de ingreso
  SELECT fecha_ingreso INTO v_fecha_ingreso
  FROM empleados WHERE id = p_empleado_id;
  
  IF v_fecha_ingreso IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Fecha de calculo: 31 de diciembre del año
  v_fecha_calculo := MAKE_DATE(p_anio, 12, 31);
  
  -- Si aún no ingresó para ese año
  IF v_fecha_ingreso > v_fecha_calculo THEN
    RETURN 0;
  END IF;
  
  -- Calcular antigüedad en años y meses
  v_antiguedad_anios := EXTRACT(YEAR FROM AGE(v_fecha_calculo, v_fecha_ingreso));
  v_antiguedad_meses := EXTRACT(YEAR FROM AGE(v_fecha_calculo, v_fecha_ingreso)) * 12 
                      + EXTRACT(MONTH FROM AGE(v_fecha_calculo, v_fecha_ingreso));
  
  -- Aplicar reglas LCT Argentina
  IF v_antiguedad_meses < 6 THEN
    -- Menos de 6 meses: 1 día cada 20 días trabajados
    v_dias_trabajados := v_fecha_calculo - v_fecha_ingreso;
    v_dias_vacaciones := FLOOR(v_dias_trabajados / 20.0);
  ELSIF v_antiguedad_anios < 5 THEN
    v_dias_vacaciones := 14;
  ELSIF v_antiguedad_anios < 10 THEN
    v_dias_vacaciones := 21;
  ELSIF v_antiguedad_anios < 20 THEN
    v_dias_vacaciones := 28;
  ELSE
    v_dias_vacaciones := 35;
  END IF;
  
  RETURN v_dias_vacaciones;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para obtener el cálculo de vacaciones de todos los empleados
CREATE OR REPLACE FUNCTION obtener_calculo_vacaciones_todos(p_anio INTEGER)
RETURNS TABLE (
  empleado_id UUID,
  nombre TEXT,
  apellido TEXT,
  legajo TEXT,
  fecha_ingreso DATE,
  sucursal_id UUID,
  antiguedad_anios INTEGER,
  antiguedad_meses INTEGER,
  dias_segun_ley NUMERIC,
  dias_en_sistema NUMERIC,
  dias_usados NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as empleado_id,
    e.nombre,
    e.apellido,
    e.legajo,
    e.fecha_ingreso,
    e.sucursal_id,
    EXTRACT(YEAR FROM AGE(MAKE_DATE(p_anio, 12, 31), e.fecha_ingreso))::INTEGER as antiguedad_anios,
    (EXTRACT(YEAR FROM AGE(MAKE_DATE(p_anio, 12, 31), e.fecha_ingreso)) * 12 
     + EXTRACT(MONTH FROM AGE(MAKE_DATE(p_anio, 12, 31), e.fecha_ingreso)))::INTEGER as antiguedad_meses,
    calcular_vacaciones_ley_argentina(e.id, p_anio) as dias_segun_ley,
    COALESCE(vs.dias_acumulados, 0) as dias_en_sistema,
    COALESCE(vs.dias_usados, 0) as dias_usados
  FROM empleados e
  LEFT JOIN vacaciones_saldo vs ON vs.empleado_id = e.id AND vs.anio = p_anio
  WHERE e.activo = true
  ORDER BY e.apellido, e.nombre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para recalcular y actualizar todos los saldos de vacaciones
CREATE OR REPLACE FUNCTION recalcular_todos_saldos_vacaciones(p_anio INTEGER)
RETURNS TABLE (
  empleado_id UUID,
  nombre TEXT,
  apellido TEXT,
  dias_anteriores NUMERIC,
  dias_nuevos NUMERIC,
  actualizado BOOLEAN
) AS $$
DECLARE
  r RECORD;
  v_dias_nuevos NUMERIC;
BEGIN
  FOR r IN 
    SELECT e.id, e.nombre, e.apellido, COALESCE(vs.dias_acumulados, 0) as dias_ant, vs.id as saldo_id, COALESCE(vs.dias_usados, 0) as dias_usados
    FROM empleados e
    LEFT JOIN vacaciones_saldo vs ON vs.empleado_id = e.id AND vs.anio = p_anio
    WHERE e.activo = true AND e.fecha_ingreso IS NOT NULL
  LOOP
    v_dias_nuevos := calcular_vacaciones_ley_argentina(r.id, p_anio);
    
    IF r.saldo_id IS NOT NULL THEN
      -- Actualizar registro existente
      UPDATE vacaciones_saldo 
      SET dias_acumulados = v_dias_nuevos,
          dias_pendientes = v_dias_nuevos - r.dias_usados,
          updated_at = now()
      WHERE id = r.saldo_id;
      
      empleado_id := r.id;
      nombre := r.nombre;
      apellido := r.apellido;
      dias_anteriores := r.dias_ant;
      dias_nuevos := v_dias_nuevos;
      actualizado := true;
      RETURN NEXT;
    ELSE
      -- Crear nuevo registro
      INSERT INTO vacaciones_saldo (empleado_id, anio, dias_acumulados, dias_usados, dias_pendientes)
      VALUES (r.id, p_anio, v_dias_nuevos, 0, v_dias_nuevos);
      
      empleado_id := r.id;
      nombre := r.nombre;
      apellido := r.apellido;
      dias_anteriores := 0;
      dias_nuevos := v_dias_nuevos;
      actualizado := true;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;