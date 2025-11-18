-- Recrear función para actualizar datos sensibles incluyendo id_centum
CREATE OR REPLACE FUNCTION admin_update_sensitive_data(
  p_empleado_id uuid,
  p_telefono text DEFAULT NULL,
  p_direccion text DEFAULT NULL,
  p_salario numeric DEFAULT NULL,
  p_fecha_nacimiento date DEFAULT NULL,
  p_estado_civil text DEFAULT NULL,
  p_emergencia_contacto_nombre text DEFAULT NULL,
  p_emergencia_contacto_telefono text DEFAULT NULL,
  p_id_centum text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el usuario actual es admin
  IF NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden actualizar datos sensibles';
  END IF;

  -- Actualizar o insertar datos sensibles
  INSERT INTO empleados_datos_sensibles (
    empleado_id,
    telefono,
    direccion,
    salario,
    fecha_nacimiento,
    estado_civil,
    emergencia_contacto_nombre,
    emergencia_contacto_telefono,
    id_centum
  ) VALUES (
    p_empleado_id,
    p_telefono,
    p_direccion,
    p_salario,
    p_fecha_nacimiento,
    p_estado_civil,
    p_emergencia_contacto_nombre,
    p_emergencia_contacto_telefono,
    p_id_centum
  )
  ON CONFLICT (empleado_id) DO UPDATE SET
    telefono = EXCLUDED.telefono,
    direccion = EXCLUDED.direccion,
    salario = EXCLUDED.salario,
    fecha_nacimiento = EXCLUDED.fecha_nacimiento,
    estado_civil = EXCLUDED.estado_civil,
    emergencia_contacto_nombre = EXCLUDED.emergencia_contacto_nombre,
    emergencia_contacto_telefono = EXCLUDED.emergencia_contacto_telefono,
    id_centum = EXCLUDED.id_centum,
    updated_at = now();
END;
$$;