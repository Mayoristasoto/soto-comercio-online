-- Corregir problemas de seguridad eliminando dependencias primero

-- 1. Eliminar política que depende de la función
DROP POLICY IF EXISTS "admin_users_manage_gondolas" ON public.gondolas;

-- 2. Ahora eliminar y recrear la función corregida
DROP FUNCTION IF EXISTS public.is_admin_user();

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  -- Si no hay perfiles o sistema de roles, por defecto todos los autenticados son admin
  -- Esto se puede personalizar cuando implementen roles específicos
  RETURN auth.uid() IS NOT NULL;
END;
$$;

-- 3. Crear tabla de datos públicos (más seguro que vista)
CREATE TABLE IF NOT EXISTS public.gondolas_display (
  id text PRIMARY KEY,
  type text NOT NULL,
  position_x numeric NOT NULL,
  position_y numeric NOT NULL,
  position_width numeric NOT NULL,
  position_height numeric NOT NULL,
  status text NOT NULL,
  section text NOT NULL,
  display_category text DEFAULT 'Espacio Comercial',
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. Habilitar RLS en la nueva tabla
ALTER TABLE public.gondolas_display ENABLE ROW LEVEL SECURITY;

-- 5. Permitir acceso público solo a información no sensible
CREATE POLICY "allow_public_read_display" 
ON public.gondolas_display 
FOR SELECT 
TO anon, authenticated
USING (true);

-- 6. Solo usuarios autenticados pueden actualizar la tabla de display
CREATE POLICY "authenticated_can_update_display" 
ON public.gondolas_display 
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 7. Función para sincronizar datos seguros a tabla de display
CREATE OR REPLACE FUNCTION public.sync_gondola_display()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insertar o actualizar solo información no sensible
  INSERT INTO public.gondolas_display (
    id, type, position_x, position_y, position_width, position_height,
    status, section, display_category, updated_at
  ) VALUES (
    NEW.id, NEW.type, NEW.position_x, NEW.position_y, 
    NEW.position_width, NEW.position_height, NEW.status, NEW.section,
    CASE 
      WHEN NEW.status = 'occupied' THEN 'Espacio Ocupado'
      ELSE 'Disponible'
    END,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    type = EXCLUDED.type,
    position_x = EXCLUDED.position_x,
    position_y = EXCLUDED.position_y,
    position_width = EXCLUDED.position_width,
    position_height = EXCLUDED.position_height,
    status = EXCLUDED.status,
    section = EXCLUDED.section,
    display_category = EXCLUDED.display_category,
    updated_at = EXCLUDED.updated_at;
    
  RETURN NEW;
END;
$$;

-- 8. Trigger para mantener sincronizada la tabla de display
DROP TRIGGER IF EXISTS sync_gondola_display_trigger ON public.gondolas;
CREATE TRIGGER sync_gondola_display_trigger
  AFTER INSERT OR UPDATE ON public.gondolas
  FOR EACH ROW EXECUTE FUNCTION public.sync_gondola_display();

-- 9. Poblar tabla de display con datos existentes (sin información sensible)
INSERT INTO public.gondolas_display (
  id, type, position_x, position_y, position_width, position_height,
  status, section, display_category
)
SELECT 
  id, type, position_x, position_y, position_width, position_height,
  status, section,
  CASE 
    WHEN status = 'occupied' THEN 'Espacio Ocupado'
    ELSE 'Disponible'
  END
FROM public.gondolas
ON CONFLICT (id) DO NOTHING;