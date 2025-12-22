-- Corregir función para evitar DELETE sin WHERE
CREATE OR REPLACE FUNCTION generar_pins_masivo()
RETURNS TABLE (
  empleado_id uuid,
  nombre text,
  apellido text,
  legajo text,
  pin_generado text,
  ya_tenia_pin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empleado RECORD;
  v_nuevo_pin TEXT;
  v_admin_id UUID;
BEGIN
  -- Obtener el empleado admin actual
  SELECT id INTO v_admin_id
  FROM empleados
  WHERE user_id = auth.uid() AND rol = 'admin_rrhh' AND activo = true;
  
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Solo administradores pueden ejecutar esta función';
  END IF;

  -- Eliminar tabla temporal si existe y crear nueva
  DROP TABLE IF EXISTS pg_temp.pins_generados;
  
  CREATE TEMP TABLE pins_generados (
    empleado_id uuid,
    nombre text,
    apellido text,
    legajo text,
    pin_generado text,
    ya_tenia_pin boolean
  ) ON COMMIT DROP;

  -- Iterar sobre todos los empleados activos
  FOR v_empleado IN 
    SELECT e.id, e.nombre, e.apellido, e.legajo,
           CASE WHEN ep.id IS NOT NULL AND ep.activo = true THEN true ELSE false END as tiene_pin
    FROM empleados e
    LEFT JOIN empleados_pin ep ON e.id = ep.empleado_id AND ep.activo = true
    WHERE e.activo = true
    ORDER BY e.apellido, e.nombre
  LOOP
    -- Generar PIN aleatorio de 4 dígitos
    v_nuevo_pin := LPAD((floor(random() * 9000) + 1000)::text, 4, '0');
    
    -- Insertar o actualizar PIN usando hash_pin (SHA256)
    INSERT INTO empleados_pin (empleado_id, pin_hash, activo, creado_por, intentos_fallidos)
    VALUES (
      v_empleado.id,
      hash_pin(v_nuevo_pin),
      true,
      v_admin_id,
      0
    )
    ON CONFLICT (empleado_id) 
    DO UPDATE SET 
      pin_hash = hash_pin(v_nuevo_pin),
      activo = true,
      intentos_fallidos = 0,
      bloqueado_hasta = NULL,
      updated_at = now();
    
    -- Guardar resultado
    INSERT INTO pins_generados VALUES (
      v_empleado.id,
      v_empleado.nombre,
      v_empleado.apellido,
      v_empleado.legajo,
      v_nuevo_pin,
      v_empleado.tiene_pin
    );
  END LOOP;
  
  -- Retornar resultados
  RETURN QUERY SELECT * FROM pins_generados ORDER BY apellido, nombre;
END;
$$;