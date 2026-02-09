CREATE OR REPLACE FUNCTION public.blanquear_pins_con_dni()
RETURNS TABLE(empleado_id uuid, nombre text, apellido text, legajo text, dni text, pin_asignado text, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  emp RECORD;
  pin_text TEXT;
  dni_limpio TEXT;
BEGIN
  FOR emp IN 
    SELECT e.id, e.nombre, e.apellido, e.legajo, e.dni, e.email
    FROM empleados e
    WHERE e.activo = true 
      AND e.dni IS NOT NULL 
      AND e.dni != ''
      AND e.rol != 'admin_rrhh'
  LOOP
    dni_limpio := REGEXP_REPLACE(emp.dni, '[^0-9]', '', 'g');
    
    IF LENGTH(dni_limpio) < 4 THEN
      CONTINUE;
    END IF;
    
    pin_text := RIGHT(dni_limpio, 4);
    
    INSERT INTO empleados_pin (empleado_id, pin_hash, activo, intentos_fallidos, creado_por)
    VALUES (
      emp.id,
      crypt(pin_text, gen_salt('bf', 8)),
      true,
      0,
      auth.uid()
    )
    ON CONFLICT (empleado_id) 
    DO UPDATE SET 
      pin_hash = crypt(pin_text, gen_salt('bf', 8)),
      activo = true,
      intentos_fallidos = 0,
      bloqueado_hasta = NULL,
      updated_at = NOW();
    
    UPDATE empleados SET debe_cambiar_password = true WHERE id = emp.id;
    
    RETURN QUERY SELECT emp.id, emp.nombre, emp.apellido, emp.legajo, emp.dni, pin_text, emp.email;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.blanquear_pins_con_dni() TO authenticated;