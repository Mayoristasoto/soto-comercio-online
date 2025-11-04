-- Insertar enlace para Aprobar Fotos Faciales en el sidebar de admin
INSERT INTO public.app_pages (
  nombre,
  path,
  icon,
  descripcion,
  orden,
  visible,
  mostrar_en_sidebar,
  roles_permitidos,
  tipo,
  titulo_pagina,
  requiere_auth
) VALUES (
  'Aprobar Fotos Faciales',
  '/admin/aprobar-fotos-faciales',
  'Camera',
  'Aprobar registros faciales de empleados',
  30,
  true,
  true,
  ARRAY['admin_rrhh']::text[],
  'link',
  'Aprobar Fotos Faciales',
  true
)
ON CONFLICT (path) 
DO UPDATE SET
  nombre = EXCLUDED.nombre,
  icon = EXCLUDED.icon,
  descripcion = EXCLUDED.descripcion,
  visible = EXCLUDED.visible,
  mostrar_en_sidebar = EXCLUDED.mostrar_en_sidebar,
  roles_permitidos = EXCLUDED.roles_permitidos;