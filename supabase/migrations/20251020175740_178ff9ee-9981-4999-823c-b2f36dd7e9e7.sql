-- Crear función para sincronizar app_pages con sidebar_links
CREATE OR REPLACE FUNCTION sync_app_pages_to_sidebar_links()
RETURNS TRIGGER AS $$
DECLARE
  rol_item TEXT;
BEGIN
  -- Si es INSERT o UPDATE en app_pages
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Para cada rol permitido en la página
    FOREACH rol_item IN ARRAY NEW.roles_permitidos LOOP
      -- Insertar o actualizar en sidebar_links
      INSERT INTO sidebar_links (
        rol,
        label,
        path,
        icon,
        descripcion,
        orden,
        visible,
        parent_id
      ) VALUES (
        rol_item::user_role,  -- Convertir texto a enum user_role
        NEW.nombre,
        NEW.path,
        NEW.icon,
        NEW.descripcion,
        NEW.orden,
        NEW.visible,
        NEW.parent_id
      )
      ON CONFLICT (rol, path) 
      DO UPDATE SET
        label = EXCLUDED.label,
        icon = EXCLUDED.icon,
        descripcion = EXCLUDED.descripcion,
        orden = EXCLUDED.orden,
        visible = EXCLUDED.visible,
        parent_id = EXCLUDED.parent_id;
    END LOOP;
    
    -- Eliminar sidebar_links de roles que ya no están en roles_permitidos
    DELETE FROM sidebar_links
    WHERE path = NEW.path
    AND rol::text NOT IN (SELECT unnest(NEW.roles_permitidos));
    
  -- Si es DELETE en app_pages
  ELSIF (TG_OP = 'DELETE') THEN
    DELETE FROM sidebar_links WHERE path = OLD.path;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Crear trigger para sincronización automática
DROP TRIGGER IF EXISTS sync_app_pages_trigger ON app_pages;
CREATE TRIGGER sync_app_pages_trigger
AFTER INSERT OR UPDATE OR DELETE ON app_pages
FOR EACH ROW
EXECUTE FUNCTION sync_app_pages_to_sidebar_links();

-- Sincronizar datos existentes
DO $$
DECLARE
  page_record RECORD;
  rol_item TEXT;
BEGIN
  -- Limpiar sidebar_links
  DELETE FROM sidebar_links;
  
  -- Insertar todos los registros de app_pages en sidebar_links
  FOR page_record IN SELECT * FROM app_pages LOOP
    FOREACH rol_item IN ARRAY page_record.roles_permitidos LOOP
      INSERT INTO sidebar_links (
        rol,
        label,
        path,
        icon,
        descripcion,
        orden,
        visible,
        parent_id
      ) VALUES (
        rol_item::user_role,  -- Convertir texto a enum user_role
        page_record.nombre,
        page_record.path,
        page_record.icon,
        page_record.descripcion,
        page_record.orden,
        page_record.visible,
        page_record.parent_id
      )
      ON CONFLICT (rol, path) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;