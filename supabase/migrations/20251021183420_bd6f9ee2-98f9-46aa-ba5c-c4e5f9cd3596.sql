-- Deshabilitar trigger de sincronización temporalmente
ALTER TABLE app_pages DISABLE TRIGGER sync_app_pages_trigger;

-- Crear grupos/separadores
DO $$
DECLARE
  rrhh_id uuid;
  reconocimiento_id uuid;
  operaciones_id uuid;
BEGIN
  -- Insertar separador RRHH
  INSERT INTO app_pages (nombre, tipo, orden, roles_permitidos, visible, mostrar_en_sidebar, path, icon)
  VALUES ('RRHH', 'separator', 2, ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado']::text[], true, true, '#rrhh', 'Users')
  RETURNING id INTO rrhh_id;

  -- Insertar separador Reconocimiento
  INSERT INTO app_pages (nombre, tipo, orden, roles_permitidos, visible, mostrar_en_sidebar, path, icon)
  VALUES ('Reconocimiento', 'separator', 10, ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado']::text[], true, true, '#reconocimiento', 'Award')
  RETURNING id INTO reconocimiento_id;

  -- Insertar separador Operaciones
  INSERT INTO app_pages (nombre, tipo, orden, roles_permitidos, visible, mostrar_en_sidebar, path, icon)
  VALUES ('Operaciones', 'separator', 18, ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado']::text[], true, true, '#operaciones', 'Briefcase')
  RETURNING id INTO operaciones_id;

  -- Crear separadores en sidebar_links para cada rol
  INSERT INTO sidebar_links (rol, label, path, icon, orden, visible, tipo, parent_id)
  SELECT 
    rol_val::user_role,
    'RRHH',
    '#rrhh',
    'Users',
    2,
    true,
    'separator',
    NULL
  FROM unnest(ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado']::text[]) AS rol_val;

  INSERT INTO sidebar_links (rol, label, path, icon, orden, visible, tipo, parent_id)
  SELECT 
    rol_val::user_role,
    'Reconocimiento',
    '#reconocimiento',
    'Award',
    10,
    true,
    'separator',
    NULL
  FROM unnest(ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado']::text[]) AS rol_val;

  INSERT INTO sidebar_links (rol, label, path, icon, orden, visible, tipo, parent_id)
  SELECT 
    rol_val::user_role,
    'Operaciones',
    '#operaciones',
    'Briefcase',
    18,
    true,
    'separator',
    NULL
  FROM unnest(ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado']::text[]) AS rol_val;

  -- Actualizar enlaces RRHH
  UPDATE app_pages SET parent_id = rrhh_id, orden = 1 WHERE nombre = 'Fichero' AND tipo = 'link';
  UPDATE app_pages SET parent_id = rrhh_id, orden = 2 WHERE nombre = 'Evaluaciones' AND tipo = 'link';
  UPDATE app_pages SET parent_id = rrhh_id, orden = 3 WHERE nombre = 'Vacaciones' AND tipo = 'link';
  UPDATE app_pages SET parent_id = rrhh_id, orden = 4 WHERE nombre = 'Solicitudes' AND tipo = 'link';
  UPDATE app_pages SET parent_id = rrhh_id, orden = 5 WHERE nombre = 'Nómina' AND tipo = 'link';
  UPDATE app_pages SET parent_id = rrhh_id, orden = 6 WHERE nombre = 'Anotaciones' AND path = '/anotaciones3';
  UPDATE app_pages SET parent_id = rrhh_id, orden = 7 WHERE nombre = 'Administración' AND tipo = 'link';

  -- Actualizar enlaces Reconocimiento
  UPDATE app_pages SET parent_id = reconocimiento_id, orden = 1 WHERE nombre = 'Desafíos' AND tipo = 'link';
  UPDATE app_pages SET parent_id = reconocimiento_id, orden = 2 WHERE nombre = 'Premios' AND tipo = 'link';
  UPDATE app_pages SET parent_id = reconocimiento_id, orden = 3 WHERE nombre = 'Ranking' AND tipo = 'link';
  UPDATE app_pages SET parent_id = reconocimiento_id, orden = 4 WHERE nombre = 'Insignias' AND tipo = 'link';

  -- Actualizar enlaces Operaciones
  UPDATE app_pages SET parent_id = operaciones_id, orden = 1 WHERE nombre = 'Tareas' AND tipo = 'link';

  -- Enlaces sin grupo
  UPDATE app_pages SET parent_id = NULL, orden = 1 WHERE nombre = 'Dashboard' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 17 WHERE nombre = 'Autogestión' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 19 WHERE nombre = 'Configuración' AND tipo = 'link';
  
  -- Deshabilitar enlaces comercio
  UPDATE app_pages SET parent_id = NULL, orden = 20, visible = false WHERE nombre = 'Góndolas' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 21, visible = false WHERE nombre = 'Comercio' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 22, visible = false WHERE nombre = 'Centum' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 23, visible = false WHERE nombre = 'Gulero' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 24, visible = false WHERE nombre = 'Mayorista' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 25, visible = false WHERE nombre = 'Particular' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 26, visible = false WHERE nombre = 'Reventa' AND tipo = 'link';
  
  UPDATE app_pages SET parent_id = NULL, orden = 27 WHERE nombre = 'Kiosk' AND tipo = 'link';
  UPDATE app_pages SET mostrar_en_sidebar = false WHERE nombre = 'Anotaciones' AND path = '/anotaciones2';

END $$;

-- Reactivar trigger
ALTER TABLE app_pages ENABLE TRIGGER sync_app_pages_trigger;