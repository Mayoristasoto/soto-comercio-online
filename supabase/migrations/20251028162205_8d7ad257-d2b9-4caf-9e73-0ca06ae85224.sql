-- Insertar entrada para Entregas de Elementos en el menú de Nómina
INSERT INTO app_pages (
  nombre,
  path,
  icon,
  descripcion,
  orden,
  parent_id,
  roles_permitidos,
  visible,
  mostrar_en_sidebar,
  requiere_auth,
  tipo,
  titulo_pagina
) VALUES (
  'Entregas',
  '/rrhh/nomina#entregas',
  'Package',
  'Gestión de entrega de elementos a empleados',
  11,
  '9808d20a-8b83-43d2-b724-09c0c6c0cd70',
  ARRAY['admin_rrhh']::text[],
  true,
  true,
  true,
  'link',
  'Entregas de Elementos'
)
ON CONFLICT DO NOTHING;