-- Deshabilitar trigger temporalmente
ALTER TABLE app_pages DISABLE TRIGGER sync_app_pages_trigger;

DO $$
DECLARE
  rrhh_id uuid;
  reconocimiento_id uuid;
  operaciones_id uuid;
BEGIN
  -- Obtener IDs de separadores
  SELECT id INTO rrhh_id FROM app_pages WHERE nombre = 'RRHH' AND tipo = 'separator';
  SELECT id INTO reconocimiento_id FROM app_pages WHERE nombre = 'Reconocimiento' AND tipo = 'separator';
  SELECT id INTO operaciones_id FROM app_pages WHERE nombre = 'Operaciones' AND tipo = 'separator';

  -- Insertar separadores en sidebar_links (si no existen)
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
  FROM unnest(ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado']::text[]) AS rol_val
  ON CONFLICT (rol, path) DO NOTHING;

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
  FROM unnest(ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado']::text[]) AS rol_val
  ON CONFLICT (rol, path) DO NOTHING;

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
  FROM unnest(ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado']::text[]) AS rol_val
  ON CONFLICT (rol, path) DO NOTHING;

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
  UPDATE app_pages SET parent_id = NULL, orden = 27 WHERE nombre = 'Kiosk' AND tipo = 'link';
  
  -- Deshabilitar enlaces comercio
  UPDATE app_pages SET parent_id = NULL, orden = 20, visible = false WHERE nombre = 'Góndolas' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 21, visible = false WHERE nombre = 'Comercio' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 22, visible = false WHERE nombre = 'Centum' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 23, visible = false WHERE nombre = 'Gulero' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 24, visible = false WHERE nombre = 'Mayorista' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 25, visible = false WHERE nombre = 'Particular' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 26, visible = false WHERE nombre = 'Reventa' AND tipo = 'link';
  
  UPDATE app_pages SET mostrar_en_sidebar = false WHERE nombre = 'Anotaciones' AND path = '/anotaciones2';

END $$;

-- Reactivar trigger
ALTER TABLE app_pages ENABLE TRIGGER sync_app_pages_trigger;