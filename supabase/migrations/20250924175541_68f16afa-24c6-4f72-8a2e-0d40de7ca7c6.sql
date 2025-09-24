-- Agregar constraint único para user_id en empleados
ALTER TABLE public.empleados ADD CONSTRAINT empleados_user_id_unique UNIQUE (user_id);

-- Actualizar la función trigger para corregir el ON CONFLICT
CREATE OR REPLACE FUNCTION public.handle_new_user_empleado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Buscar si existe un empleado con el mismo email
  UPDATE empleados 
  SET user_id = NEW.id 
  WHERE email = NEW.email AND user_id IS NULL;
  
  -- Si no existe empleado, crear uno básico
  IF NOT FOUND THEN
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
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario Nuevo'),
      '',
      NEW.email,
      'empleado',
      CURRENT_DATE,
      '9682b6cf-f904-4497-918c-d0c9c061b9ec'::uuid
    )
    ON CONFLICT (user_id) DO UPDATE SET
      nombre = EXCLUDED.nombre,
      apellido = EXCLUDED.apellido,
      email = EXCLUDED.email;
  END IF;
  
  RETURN NEW;
END;
$function$;