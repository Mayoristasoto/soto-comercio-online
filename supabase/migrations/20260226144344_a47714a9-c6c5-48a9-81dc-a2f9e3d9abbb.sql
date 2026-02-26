INSERT INTO app_pages (nombre, path, icon, mostrar_en_sidebar, visible, roles_permitidos, parent_id, orden, requiere_auth, tipo)
VALUES (
  'Novedades Alert',
  '/operaciones/novedades-alertas',
  'Bell',
  true,
  true,
  ARRAY['admin_rrhh', 'gerente_sucursal', 'lider_grupo'],
  '2ad11082-daf8-4fae-ad71-bdf038727604',
  19,
  true,
  'link'
);