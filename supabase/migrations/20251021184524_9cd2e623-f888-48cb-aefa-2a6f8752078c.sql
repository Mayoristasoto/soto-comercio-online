DO $$
DECLARE
  rrhh_id uuid;
  reconocimiento_id uuid;
  operaciones_id uuid;
BEGIN
  -- Obtener IDs de separadores en app_pages
  SELECT id INTO rrhh_id FROM app_pages WHERE nombre = 'RRHH' AND tipo = 'separator' LIMIT 1;
  SELECT id INTO reconocimiento_id FROM app_pages WHERE nombre = 'Reconocimiento' AND tipo = 'separator' LIMIT 1;
  SELECT id INTO operaciones_id FROM app_pages WHERE nombre = 'Operaciones' AND tipo = 'separator' LIMIT 1;

  IF rrhh_id IS NULL OR reconocimiento_id IS NULL OR operaciones_id IS NULL THEN
    RAISE EXCEPTION 'Separadores no encontrados';
  END IF;

  -- Asegurar padres en sidebar_links con IDs iguales a app_pages.parent_id
  -- RRHH
  IF EXISTS (SELECT 1 FROM sidebar_links WHERE path = '#rrhh' AND rol = 'admin_rrhh') THEN
    UPDATE sidebar_links 
      SET id = rrhh_id, label='RRHH', icon='Users', orden=2, visible=true, tipo='separator', parent_id=NULL
    WHERE path = '#rrhh' AND rol = 'admin_rrhh';
  ELSE
    INSERT INTO sidebar_links (id, rol, label, path, icon, orden, visible, tipo, parent_id)
    VALUES (rrhh_id, 'admin_rrhh', 'RRHH', '#rrhh', 'Users', 2, true, 'separator', NULL);
  END IF;

  -- Reconocimiento
  IF EXISTS (SELECT 1 FROM sidebar_links WHERE path = '#reconocimiento' AND rol = 'admin_rrhh') THEN
    UPDATE sidebar_links 
      SET id = reconocimiento_id, label='Reconocimiento', icon='Award', orden=10, visible=true, tipo='separator', parent_id=NULL
    WHERE path = '#reconocimiento' AND rol = 'admin_rrhh';
  ELSE
    INSERT INTO sidebar_links (id, rol, label, path, icon, orden, visible, tipo, parent_id)
    VALUES (reconocimiento_id, 'admin_rrhh', 'Reconocimiento', '#reconocimiento', 'Award', 10, true, 'separator', NULL);
  END IF;

  -- Operaciones
  IF EXISTS (SELECT 1 FROM sidebar_links WHERE path = '#operaciones' AND rol = 'admin_rrhh') THEN
    UPDATE sidebar_links 
      SET id = operaciones_id, label='Operaciones', icon='Briefcase', orden=18, visible=true, tipo='separator', parent_id=NULL
    WHERE path = '#operaciones' AND rol = 'admin_rrhh';
  ELSE
    INSERT INTO sidebar_links (id, rol, label, path, icon, orden, visible, tipo, parent_id)
    VALUES (operaciones_id, 'admin_rrhh', 'Operaciones', '#operaciones', 'Briefcase', 18, true, 'separator', NULL);
  END IF;

  -- Ahora agrupar páginas
  UPDATE app_pages SET parent_id = rrhh_id, orden = 1 WHERE nombre = 'Fichero' AND tipo = 'link';
  UPDATE app_pages SET parent_id = rrhh_id, orden = 2 WHERE nombre = 'Evaluaciones' AND tipo = 'link';
  UPDATE app_pages SET parent_id = rrhh_id, orden = 3 WHERE nombre = 'Vacaciones' AND tipo = 'link';
  UPDATE app_pages SET parent_id = rrhh_id, orden = 4 WHERE nombre = 'Solicitudes' AND tipo = 'link';
  UPDATE app_pages SET parent_id = rrhh_id, orden = 5 WHERE nombre = 'Nómina' AND tipo = 'link';
  UPDATE app_pages SET parent_id = rrhh_id, orden = 6 WHERE nombre = 'Anotaciones' AND tipo = 'link';
  UPDATE app_pages SET parent_id = rrhh_id, orden = 7 WHERE nombre = 'Administración' AND tipo = 'link';

  UPDATE app_pages SET parent_id = reconocimiento_id, orden = 1 WHERE nombre = 'Desafíos' AND tipo = 'link';
  UPDATE app_pages SET parent_id = reconocimiento_id, orden = 2 WHERE nombre = 'Premios' AND tipo = 'link';
  UPDATE app_pages SET parent_id = reconocimiento_id, orden = 3 WHERE nombre = 'Ranking' AND tipo = 'link';
  UPDATE app_pages SET parent_id = reconocimiento_id, orden = 4 WHERE nombre = 'Insignias' AND tipo = 'link';

  UPDATE app_pages SET parent_id = operaciones_id, orden = 1 WHERE nombre = 'Tareas' AND tipo = 'link';

  -- Sin grupo
  UPDATE app_pages SET parent_id = NULL, orden = 1 WHERE nombre = 'Dashboard' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 17 WHERE nombre = 'Autogestión' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 19 WHERE nombre = 'Configuración' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 27 WHERE nombre = 'Kiosk' AND tipo = 'link';

  -- Deshabilitar enlaces de comercio (reactivables)
  UPDATE app_pages SET parent_id = NULL, orden = 20, visible = false WHERE nombre = 'Góndolas' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 21, visible = false WHERE nombre = 'Comercio' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 22, visible = false WHERE nombre = 'Centum' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 23, visible = false WHERE nombre = 'Gulero' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 24, visible = false WHERE nombre = 'Mayorista' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 25, visible = false WHERE nombre = 'Particular' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 26, visible = false WHERE nombre = 'Reventa' AND tipo = 'link';

  UPDATE app_pages SET mostrar_en_sidebar = false WHERE nombre = 'Anotaciones' AND path = '/anotaciones2';
END $$;