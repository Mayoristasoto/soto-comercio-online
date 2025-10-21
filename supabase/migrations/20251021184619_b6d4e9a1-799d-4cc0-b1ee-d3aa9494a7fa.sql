DO $$
DECLARE
  rrhh_id_app uuid;
  reconocimiento_id_app uuid;
  operaciones_id_app uuid;
  
  rrhh_id_admin uuid;
  rrhh_id_gerente uuid;
  rrhh_id_empleado uuid;
  
  reconocimiento_id_admin uuid;
  reconocimiento_id_gerente uuid;
  reconocimiento_id_empleado uuid;
  
  operaciones_id_admin uuid;
  operaciones_id_gerente uuid;
  operaciones_id_empleado uuid;
BEGIN
  -- IDs de app_pages
  SELECT id INTO rrhh_id_app FROM app_pages WHERE nombre = 'RRHH' AND tipo = 'separator';
  SELECT id INTO reconocimiento_id_app FROM app_pages WHERE nombre = 'Reconocimiento' AND tipo = 'separator';
  SELECT id INTO operaciones_id_app FROM app_pages WHERE nombre = 'Operaciones' AND tipo = 'separator';

  -- IDs de sidebar_links por rol
  SELECT id INTO rrhh_id_admin FROM sidebar_links WHERE path = '#rrhh' AND rol = 'admin_rrhh';
  SELECT id INTO rrhh_id_gerente FROM sidebar_links WHERE path = '#rrhh' AND rol = 'gerente_sucursal';
  SELECT id INTO rrhh_id_empleado FROM sidebar_links WHERE path = '#rrhh' AND rol = 'empleado';
  
  SELECT id INTO reconocimiento_id_admin FROM sidebar_links WHERE path = '#reconocimiento' AND rol = 'admin_rrhh';
  SELECT id INTO reconocimiento_id_gerente FROM sidebar_links WHERE path = '#reconocimiento' AND rol = 'gerente_sucursal';
  SELECT id INTO reconocimiento_id_empleado FROM sidebar_links WHERE path = '#reconocimiento' AND rol = 'empleado';
  
  SELECT id INTO operaciones_id_admin FROM sidebar_links WHERE path = '#operaciones' AND rol = 'admin_rrhh';
  SELECT id INTO operaciones_id_gerente FROM sidebar_links WHERE path = '#operaciones' AND rol = 'gerente_sucursal';
  SELECT id INTO operaciones_id_empleado FROM sidebar_links WHERE path = '#operaciones' AND rol = 'empleado';

  -- Actualizar app_pages
  UPDATE app_pages SET parent_id = rrhh_id_app, orden = 1 WHERE nombre = 'Fichero' AND tipo = 'link';
  UPDATE app_pages SET parent_id = rrhh_id_app, orden = 2 WHERE nombre = 'Evaluaciones' AND tipo = 'link';
  UPDATE app_pages SET parent_id = rrhh_id_app, orden = 3 WHERE nombre = 'Vacaciones' AND tipo = 'link';
  UPDATE app_pages SET parent_id = rrhh_id_app, orden = 4 WHERE nombre = 'Solicitudes' AND tipo = 'link';
  UPDATE app_pages SET parent_id = rrhh_id_app, orden = 5 WHERE nombre = 'Nómina' AND tipo = 'link';
  UPDATE app_pages SET parent_id = rrhh_id_app, orden = 6 WHERE nombre = 'Anotaciones' AND tipo = 'link';
  UPDATE app_pages SET parent_id = rrhh_id_app, orden = 7 WHERE nombre = 'Administración' AND tipo = 'link';

  UPDATE app_pages SET parent_id = reconocimiento_id_app, orden = 1 WHERE nombre = 'Desafíos' AND tipo = 'link';
  UPDATE app_pages SET parent_id = reconocimiento_id_app, orden = 2 WHERE nombre = 'Premios' AND tipo = 'link';
  UPDATE app_pages SET parent_id = reconocimiento_id_app, orden = 3 WHERE nombre = 'Ranking' AND tipo = 'link';
  UPDATE app_pages SET parent_id = reconocimiento_id_app, orden = 4 WHERE nombre = 'Insignias' AND tipo = 'link';

  UPDATE app_pages SET parent_id = operaciones_id_app, orden = 1 WHERE nombre = 'Tareas' AND tipo = 'link';

  UPDATE app_pages SET parent_id = NULL, orden = 1 WHERE nombre = 'Dashboard' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 17 WHERE nombre = 'Autogestión' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 19 WHERE nombre = 'Configuración' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 27 WHERE nombre = 'Kiosk' AND tipo = 'link';

  UPDATE app_pages SET parent_id = NULL, orden = 20, visible = false WHERE nombre = 'Góndolas' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 21, visible = false WHERE nombre = 'Comercio' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 22, visible = false WHERE nombre = 'Centum' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 23, visible = false WHERE nombre = 'Gulero' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 24, visible = false WHERE nombre = 'Mayorista' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 25, visible = false WHERE nombre = 'Particular' AND tipo = 'link';
  UPDATE app_pages SET parent_id = NULL, orden = 26, visible = false WHERE nombre = 'Reventa' AND tipo = 'link';

  UPDATE app_pages SET mostrar_en_sidebar = false WHERE nombre = 'Anotaciones' AND path = '/anotaciones2';

  -- Actualizar sidebar_links directamente por rol

  -- RRHH admin
  UPDATE sidebar_links SET parent_id = rrhh_id_admin, orden = 1 WHERE label = 'Fichero' AND rol = 'admin_rrhh';
  UPDATE sidebar_links SET parent_id = rrhh_id_admin, orden = 2 WHERE label = 'Evaluaciones' AND rol = 'admin_rrhh';
  UPDATE sidebar_links SET parent_id = rrhh_id_admin, orden = 3 WHERE label = 'Vacaciones' AND rol = 'admin_rrhh';
  UPDATE sidebar_links SET parent_id = rrhh_id_admin, orden = 4 WHERE label = 'Solicitudes' AND rol = 'admin_rrhh';
  UPDATE sidebar_links SET parent_id = rrhh_id_admin, orden = 5 WHERE label = 'Nómina' AND rol = 'admin_rrhh';
  UPDATE sidebar_links SET parent_id = rrhh_id_admin, orden = 6 WHERE label = 'Anotaciones' AND rol = 'admin_rrhh';
  UPDATE sidebar_links SET parent_id = rrhh_id_admin, orden = 7 WHERE label = 'Administración' AND rol = 'admin_rrhh';

  -- RRHH gerente
  UPDATE sidebar_links SET parent_id = rrhh_id_gerente, orden = 1 WHERE label = 'Fichero' AND rol = 'gerente_sucursal';
  UPDATE sidebar_links SET parent_id = rrhh_id_gerente, orden = 2 WHERE label = 'Evaluaciones' AND rol = 'gerente_sucursal';
  UPDATE sidebar_links SET parent_id = rrhh_id_gerente, orden = 3 WHERE label = 'Vacaciones' AND rol = 'gerente_sucursal';
  UPDATE sidebar_links SET parent_id = rrhh_id_gerente, orden = 4 WHERE label = 'Solicitudes' AND rol = 'gerente_sucursal';
  UPDATE sidebar_links SET parent_id = rrhh_id_gerente, orden = 5 WHERE label = 'Nómina' AND rol = 'gerente_sucursal';
  UPDATE sidebar_links SET parent_id = rrhh_id_gerente, orden = 6 WHERE label = 'Anotaciones' AND rol = 'gerente_sucursal';
  UPDATE sidebar_links SET parent_id = rrhh_id_gerente, orden = 7 WHERE label = 'Administración' AND rol = 'gerente_sucursal';

  -- RRHH empleado
  UPDATE sidebar_links SET parent_id = rrhh_id_empleado, orden = 1 WHERE label = 'Fichero' AND rol = 'empleado';
  UPDATE sidebar_links SET parent_id = rrhh_id_empleado, orden = 2 WHERE label = 'Evaluaciones' AND rol = 'empleado';
  UPDATE sidebar_links SET parent_id = rrhh_id_empleado, orden = 3 WHERE label = 'Vacaciones' AND rol = 'empleado';
  UPDATE sidebar_links SET parent_id = rrhh_id_empleado, orden = 4 WHERE label = 'Solicitudes' AND rol = 'empleado';
  UPDATE sidebar_links SET parent_id = rrhh_id_empleado, orden = 5 WHERE label = 'Nómina' AND rol = 'empleado';
  UPDATE sidebar_links SET parent_id = rrhh_id_empleado, orden = 6 WHERE label = 'Anotaciones' AND rol = 'empleado';
  UPDATE sidebar_links SET parent_id = rrhh_id_empleado, orden = 7 WHERE label = 'Administración' AND rol = 'empleado';

  -- Reconocimiento (todos los roles)
  UPDATE sidebar_links SET parent_id = reconocimiento_id_admin, orden = 1 WHERE label = 'Desafíos' AND rol = 'admin_rrhh';
  UPDATE sidebar_links SET parent_id = reconocimiento_id_admin, orden = 2 WHERE label = 'Premios' AND rol = 'admin_rrhh';
  UPDATE sidebar_links SET parent_id = reconocimiento_id_admin, orden = 3 WHERE label = 'Ranking' AND rol = 'admin_rrhh';
  UPDATE sidebar_links SET parent_id = reconocimiento_id_admin, orden = 4 WHERE label = 'Insignias' AND rol = 'admin_rrhh';

  UPDATE sidebar_links SET parent_id = reconocimiento_id_gerente, orden = 1 WHERE label = 'Desafíos' AND rol = 'gerente_sucursal';
  UPDATE sidebar_links SET parent_id = reconocimiento_id_gerente, orden = 2 WHERE label = 'Premios' AND rol = 'gerente_sucursal';
  UPDATE sidebar_links SET parent_id = reconocimiento_id_gerente, orden = 3 WHERE label = 'Ranking' AND rol = 'gerente_sucursal';
  UPDATE sidebar_links SET parent_id = reconocimiento_id_gerente, orden = 4 WHERE label = 'Insignias' AND rol = 'gerente_sucursal';

  UPDATE sidebar_links SET parent_id = reconocimiento_id_empleado, orden = 1 WHERE label = 'Desafíos' AND rol = 'empleado';
  UPDATE sidebar_links SET parent_id = reconocimiento_id_empleado, orden = 2 WHERE label = 'Premios' AND rol = 'empleado';
  UPDATE sidebar_links SET parent_id = reconocimiento_id_empleado, orden = 3 WHERE label = 'Ranking' AND rol = 'empleado';
  UPDATE sidebar_links SET parent_id = reconocimiento_id_empleado, orden = 4 WHERE label = 'Insignias' AND rol = 'empleado';

  -- Operaciones (todos los roles)
  UPDATE sidebar_links SET parent_id = operaciones_id_admin, orden = 1 WHERE label = 'Tareas' AND rol = 'admin_rrhh';
  UPDATE sidebar_links SET parent_id = operaciones_id_gerente, orden = 1 WHERE label = 'Tareas' AND rol = 'gerente_sucursal';
  UPDATE sidebar_links SET parent_id = operaciones_id_empleado, orden = 1 WHERE label = 'Tareas' AND rol = 'empleado';

  -- Deshabilitar enlaces de comercio en sidebar_links
  UPDATE sidebar_links SET visible = false WHERE label IN ('Góndolas', 'Comercio', 'Centum', 'Gulero', 'Mayorista', 'Particular', 'Reventa');

  -- Sin grupo
  UPDATE sidebar_links SET parent_id = NULL, orden = 1 WHERE label = 'Dashboard';
  UPDATE sidebar_links SET parent_id = NULL, orden = 17 WHERE label = 'Autogestión';
  UPDATE sidebar_links SET parent_id = NULL, orden = 19 WHERE label = 'Configuración';
  UPDATE sidebar_links SET parent_id = NULL, orden = 27 WHERE label = 'Kiosk';
END $$;