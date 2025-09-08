-- Vincular el usuario admin existente
UPDATE empleados 
SET user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'rrhhmayoristasoto@gmail.com'
  LIMIT 1
)
WHERE email = 'rrhhmayoristasoto@gmail.com' AND user_id IS NULL;

-- Crear función para vincular usuarios automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      fecha_ingreso
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
      COALESCE(NEW.raw_user_meta_data->>'apellido', 'Nuevo'),
      NEW.email,
      'empleado',
      CURRENT_DATE
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger para usuarios nuevos
DROP TRIGGER IF EXISTS on_auth_user_created_employee ON auth.users;
CREATE TRIGGER on_auth_user_created_employee
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_employee();