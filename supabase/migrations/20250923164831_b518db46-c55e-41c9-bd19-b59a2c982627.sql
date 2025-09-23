-- Fix the trigger function that creates employee records during signup
-- The issue is that sucursal_id expects UUID but was getting integer value 1

CREATE OR REPLACE FUNCTION public.handle_new_user_empleado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.empleados (
    user_id, 
    nombre, 
    apellido, 
    email, 
    rol, 
    sucursal_id, 
    activo,
    face_descriptor
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nombre', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data ->> 'apellido', ''),
    NEW.email,
    'empleado',
    '9682b6cf-f904-4497-918c-d0c9c061b9ec'::uuid, -- Use actual UUID instead of integer
    true,
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'face_descriptor' IS NOT NULL 
      THEN (NEW.raw_user_meta_data ->> 'face_descriptor')::FLOAT8[]
      ELSE NULL
    END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    apellido = EXCLUDED.apellido,
    email = EXCLUDED.email,
    face_descriptor = EXCLUDED.face_descriptor;
  
  RETURN NEW;
END;
$function$