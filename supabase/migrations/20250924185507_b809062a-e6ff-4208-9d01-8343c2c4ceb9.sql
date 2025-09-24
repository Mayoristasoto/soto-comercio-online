-- Corregir la función trigger para manejar correctamente el constraint único de email
CREATE OR REPLACE FUNCTION public.handle_new_user_empleado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Intentar actualizar un empleado existente con el mismo email
  UPDATE empleados 
  SET user_id = NEW.id 
  WHERE email = NEW.email AND user_id IS NULL;
  
  -- Si no se actualizó ningún registro, crear uno nuevo
  IF NOT FOUND THEN
    -- Insertar nuevo empleado con manejo de conflictos
    INSERT INTO empleados (
      user_id, 
      nombre, 
      apellido, 
      email, 
      rol,
      fecha_ingreso,
      sucursal_id
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.raw_user_meta_data->>'full_name', 'Usuario'),
      COALESCE(NEW.raw_user_meta_data->>'apellido', 'Nuevo'),
      NEW.email,
      'empleado',
      CURRENT_DATE,
      '9682b6cf-f904-4497-918c-d0c9c061b9ec'::uuid
    )
    ON CONFLICT (email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      nombre = COALESCE(EXCLUDED.nombre, empleados.nombre),
      apellido = COALESCE(EXCLUDED.apellido, empleados.apellido)
    WHERE empleados.user_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;