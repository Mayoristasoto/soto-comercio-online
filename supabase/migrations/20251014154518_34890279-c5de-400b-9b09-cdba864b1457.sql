-- Crear función segura para actualizar roles de empleados (solo admins)
CREATE OR REPLACE FUNCTION public.admin_update_empleado_rol(
  p_empleado_id uuid,
  p_nuevo_rol user_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el usuario actual es admin
  IF NOT current_user_is_admin() THEN
    RAISE EXCEPTION 'Solo los administradores pueden cambiar roles de empleados';
  END IF;

  -- Actualizar el rol del empleado
  UPDATE empleados
  SET rol = p_nuevo_rol,
      updated_at = now()
  WHERE id = p_empleado_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empleado no encontrado';
  END IF;
END;
$$;