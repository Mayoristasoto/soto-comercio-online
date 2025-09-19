-- Corregir funciones sin search_path configurado correctamente

-- Actualizar función handle_new_user_empleado
CREATE OR REPLACE FUNCTION public.handle_new_user_empleado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.empleados (
    id, 
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
    1, -- Default branch
    true,
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'face_descriptor' IS NOT NULL 
      THEN (NEW.raw_user_meta_data ->> 'face_descriptor')::FLOAT8[]
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    apellido = EXCLUDED.apellido,
    email = EXCLUDED.email,
    face_descriptor = EXCLUDED.face_descriptor;
  
  RETURN NEW;
END;
$function$;

-- Actualizar función update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;