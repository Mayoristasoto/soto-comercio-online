INSERT INTO public.app_pages (path, nombre, titulo_pagina, parent_id, descripcion, icon, orden, visible, requiere_auth, roles_permitidos, mostrar_en_sidebar, tipo)
VALUES (
  '/rrhh/grupos-empleados',
  'Grupos de Empleados',
  'Grupos de Empleados',
  '9808d20a-8b83-43d2-b724-09c0c6c0cd70',
  'Grupos reutilizables de empleados para informes, nómina, vacaciones, tareas, etc.',
  'Layers',
  13,
  true,
  true,
  ARRAY['admin_rrhh','gerente_general','gerente_sucursal']::text[],
  true,
  'link'
)
ON CONFLICT (path) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  icon = EXCLUDED.icon,
  parent_id = EXCLUDED.parent_id,
  roles_permitidos = EXCLUDED.roles_permitidos,
  mostrar_en_sidebar = EXCLUDED.mostrar_en_sidebar,
  visible = EXCLUDED.visible;