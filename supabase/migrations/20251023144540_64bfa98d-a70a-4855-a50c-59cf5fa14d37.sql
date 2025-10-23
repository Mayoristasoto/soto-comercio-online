-- Deshabilitar el trigger que causa el problema
ALTER TABLE app_pages DISABLE TRIGGER sync_app_pages_trigger;

-- Insertar sub-páginas en app_pages con parent_id correcto
INSERT INTO app_pages (path, nombre, titulo_pagina, descripcion, icon, orden, visible, requiere_auth, roles_permitidos, parent_id)
VALUES
  ('/operaciones/fichero/informe', 'Informe', 'Informe de Fichajes', 'Reporte detallado de fichajes y asistencia', 'FileText', 1, true, true, ARRAY['admin_rrhh', 'gerente_sucursal']::user_role[], 'f7bf57d2-cd03-48de-8934-457b7bc6db4c'),
  ('/operaciones/fichero/estado-animo', 'Estado de Ánimo', 'Estado de Ánimo', 'Registro y consulta del estado emocional', 'User', 2, true, true, ARRAY['empleado', 'gerente_sucursal', 'admin_rrhh', 'lider_grupo']::user_role[], 'f7bf57d2-cd03-48de-8934-457b7bc6db4c'),
  ('/operaciones/fichero/estadisticas', 'Estadísticas', 'Estadísticas de Asistencia', 'Análisis estadístico de fichajes', 'BarChart3', 3, true, true, ARRAY['admin_rrhh', 'gerente_sucursal']::user_role[], 'f7bf57d2-cd03-48de-8934-457b7bc6db4c'),
  ('/operaciones/fichero/incidencias', 'Incidencias', 'Incidencias de Fichaje', 'Gestión de incidencias y correcciones', 'AlertTriangle', 4, true, true, ARRAY['admin_rrhh', 'gerente_sucursal']::user_role[], 'f7bf57d2-cd03-48de-8934-457b7bc6db4c'),
  ('/operaciones/fichero/historial', 'Historial', 'Historial de Fichajes', 'Historial completo de todos los fichajes', 'History', 5, true, true, ARRAY['admin_rrhh']::user_role[], 'f7bf57d2-cd03-48de-8934-457b7bc6db4c'),
  ('/operaciones/fichero/horarios', 'Horarios', 'Gestión de Horarios', 'Configuración de horarios y turnos', 'Calendar', 6, true, true, ARRAY['admin_rrhh', 'gerente_sucursal']::user_role[], 'f7bf57d2-cd03-48de-8934-457b7bc6db4c'),
  ('/operaciones/fichero/configuracion', 'Configuración', 'Configuración de Fichero', 'Ajustes del sistema de fichado', 'Settings', 7, true, true, ARRAY['admin_rrhh']::user_role[], 'f7bf57d2-cd03-48de-8934-457b7bc6db4c'),
  ('/operaciones/fichero/administrar', 'Administrar', 'Administrar Fichajes', 'Panel de administración de fichajes', 'Shield', 8, true, true, ARRAY['admin_rrhh']::user_role[], 'f7bf57d2-cd03-48de-8934-457b7bc6db4c')
ON CONFLICT (path) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  titulo_pagina = EXCLUDED.titulo_pagina,
  descripcion = EXCLUDED.descripcion,
  icon = EXCLUDED.icon,
  orden = EXCLUDED.orden,
  parent_id = EXCLUDED.parent_id,
  roles_permitidos = EXCLUDED.roles_permitidos;

-- Ahora insertar manualmente en sidebar_links con los parent_id correctos de sidebar_links
-- Para admin_rrhh (parent: d35a01b4-4fad-4ca1-a5b6-8848f70b9b09)
INSERT INTO sidebar_links (rol, label, path, icon, descripcion, orden, visible, parent_id)
SELECT 
  'admin_rrhh'::user_role,
  ap.nombre,
  ap.path,
  ap.icon,
  ap.descripcion,
  ap.orden,
  ap.visible,
  'd35a01b4-4fad-4ca1-a5b6-8848f70b9b09'::uuid
FROM app_pages ap
WHERE ap.path IN (
  '/operaciones/fichero/informe',
  '/operaciones/fichero/estado-animo',
  '/operaciones/fichero/estadisticas',
  '/operaciones/fichero/incidencias',
  '/operaciones/fichero/historial',
  '/operaciones/fichero/horarios',
  '/operaciones/fichero/configuracion',
  '/operaciones/fichero/administrar'
)
AND 'admin_rrhh' = ANY(ap.roles_permitidos)
ON CONFLICT (rol, path) DO UPDATE SET
  label = EXCLUDED.label,
  icon = EXCLUDED.icon,
  descripcion = EXCLUDED.descripcion,
  orden = EXCLUDED.orden,
  visible = EXCLUDED.visible,
  parent_id = EXCLUDED.parent_id;

-- Para gerente_sucursal (parent: b0b5b90e-ce2d-44f6-b4ae-7bf55d1d3d6c)
INSERT INTO sidebar_links (rol, label, path, icon, descripcion, orden, visible, parent_id)
SELECT 
  'gerente_sucursal'::user_role,
  ap.nombre,
  ap.path,
  ap.icon,
  ap.descripcion,
  ap.orden,
  ap.visible,
  'b0b5b90e-ce2d-44f6-b4ae-7bf55d1d3d6c'::uuid
FROM app_pages ap
WHERE ap.path IN (
  '/operaciones/fichero/informe',
  '/operaciones/fichero/estado-animo',
  '/operaciones/fichero/estadisticas',
  '/operaciones/fichero/incidencias',
  '/operaciones/fichero/horarios'
)
AND 'gerente_sucursal' = ANY(ap.roles_permitidos)
ON CONFLICT (rol, path) DO UPDATE SET
  label = EXCLUDED.label,
  icon = EXCLUDED.icon,
  descripcion = EXCLUDED.descripcion,
  orden = EXCLUDED.orden,
  visible = EXCLUDED.visible,
  parent_id = EXCLUDED.parent_id;

-- Para empleado (parent: 3f547fcb-cb23-4863-83ce-83f86b8fced5)
INSERT INTO sidebar_links (rol, label, path, icon, descripcion, orden, visible, parent_id)
SELECT 
  'empleado'::user_role,
  ap.nombre,
  ap.path,
  ap.icon,
  ap.descripcion,
  ap.orden,
  ap.visible,
  '3f547fcb-cb23-4863-83ce-83f86b8fced5'::uuid
FROM app_pages ap
WHERE ap.path = '/operaciones/fichero/estado-animo'
AND 'empleado' = ANY(ap.roles_permitidos)
ON CONFLICT (rol, path) DO UPDATE SET
  label = EXCLUDED.label,
  icon = EXCLUDED.icon,
  descripcion = EXCLUDED.descripcion,
  orden = EXCLUDED.orden,
  visible = EXCLUDED.visible,
  parent_id = EXCLUDED.parent_id;

-- Reactivar el trigger
ALTER TABLE app_pages ENABLE TRIGGER sync_app_pages_trigger;