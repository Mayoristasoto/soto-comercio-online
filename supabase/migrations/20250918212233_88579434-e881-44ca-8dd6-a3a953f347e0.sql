-- Add facial recognition support to empleados table
ALTER TABLE public.empleados 
ADD COLUMN face_descriptor FLOAT8[];

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_empleados_face_descriptor ON public.empleados USING GIN(face_descriptor);

-- Update the handle_new_user_empleado function to handle face descriptors
CREATE OR REPLACE FUNCTION public.handle_new_user_empleado()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;