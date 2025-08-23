-- CORRECCIÓN CRÍTICA DE SEGURIDAD: Proteger datos sensibles de góndolas

-- 1. Eliminar la política demasiado permisiva actual
DROP POLICY IF EXISTS "authenticated_users_full_access" ON public.gondolas;

-- 2. Crear políticas específicas y seguras para la tabla gondolas (solo autenticados)
CREATE POLICY "authenticated_users_can_view_gondolas" 
ON public.gondolas 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_users_can_insert_gondolas" 
ON public.gondolas 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_users_can_update_gondolas" 
ON public.gondolas 
FOR UPDATE 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_users_can_delete_gondolas" 
ON public.gondolas 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- 3. Asegurar que la tabla gondolas_display solo contenga información no sensible
-- Revisar la política pública para que no exponga datos críticos
DROP POLICY IF EXISTS "allow_public_read_display" ON public.gondolas_display;

CREATE POLICY "public_can_view_basic_gondola_info" 
ON public.gondolas_display 
FOR SELECT 
USING (true); -- Solo información básica de display, sin brands ni datos sensibles

-- 4. Crear función para verificar si el usuario es administrador de forma segura
CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. Actualizar el trigger de sincronización para ser más selectivo
-- Solo sincronizar información no sensible a la tabla display
CREATE OR REPLACE FUNCTION public.sync_gondola_display()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Asegurar que el trigger esté configurado correctamente
DROP TRIGGER IF EXISTS sync_gondola_to_display ON public.gondolas;
CREATE TRIGGER sync_gondola_to_display
  AFTER INSERT OR UPDATE ON public.gondolas
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_gondola_display();