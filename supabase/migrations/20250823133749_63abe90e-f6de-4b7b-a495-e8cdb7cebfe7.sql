-- Corregir advertencias de seguridad: Function Search Path Mutable

-- 1. Actualizar función is_authenticated_user con search_path seguro
CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- 2. Actualizar función sync_gondola_display con search_path seguro
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 3. Actualizar función update_updated_at_column con search_path seguro
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;