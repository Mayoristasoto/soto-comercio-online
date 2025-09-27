-- Create a secure function to update sensitive employee data
CREATE OR REPLACE FUNCTION public.admin_update_sensitive_data(
  p_empleado_id uuid,
  p_telefono text DEFAULT NULL,
  p_direccion text DEFAULT NULL,
  p_salario numeric DEFAULT NULL,
  p_fecha_nacimiento date DEFAULT NULL,
  p_estado_civil text DEFAULT NULL,
  p_emergencia_contacto_nombre text DEFAULT NULL,
  p_emergencia_contacto_telefono text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the current user is an admin
  IF NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'Only admin users can update sensitive employee data';
  END IF;

  -- Check if record exists
  IF EXISTS (SELECT 1 FROM empleados_datos_sensibles WHERE empleado_id = p_empleado_id) THEN
    -- Update existing record
    UPDATE empleados_datos_sensibles SET
      telefono = COALESCE(p_telefono, telefono),
      direccion = COALESCE(p_direccion, direccion),
      salario = COALESCE(p_salario, salario),
      fecha_nacimiento = COALESCE(p_fecha_nacimiento, fecha_nacimiento),
      estado_civil = COALESCE(p_estado_civil, estado_civil),
      emergencia_contacto_nombre = COALESCE(p_emergencia_contacto_nombre, emergencia_contacto_nombre),
      emergencia_contacto_telefono = COALESCE(p_emergencia_contacto_telefono, emergencia_contacto_telefono),
      updated_at = now()
    WHERE empleado_id = p_empleado_id;
  ELSE
    -- Insert new record
    INSERT INTO empleados_datos_sensibles (
      empleado_id,
      telefono,
      direccion,
      salario,
      fecha_nacimiento,
      estado_civil,
      emergencia_contacto_nombre,
      emergencia_contacto_telefono
    ) VALUES (
      p_empleado_id,
      p_telefono,
      p_direccion,
      p_salario,
      p_fecha_nacimiento,
      p_estado_civil,
      p_emergencia_contacto_nombre,
      p_emergencia_contacto_telefono
    );
  END IF;
END;
$$;