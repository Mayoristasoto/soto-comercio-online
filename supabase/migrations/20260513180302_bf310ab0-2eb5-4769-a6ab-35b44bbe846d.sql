INSERT INTO public.app_pages (nombre, path, parent_id, icon, orden, mostrar_en_sidebar, roles_permitidos, visible, requiere_auth, tipo, titulo_pagina, descripcion)
VALUES (
  'Horas Extras',
  '/rrhh/nomina#horas-extras',
  '9808d20a-8b83-43d2-b724-09c0c6c0cd70',
  'Clock',
  12,
  true,
  ARRAY['admin_rrhh']::text[],
  true,
  true,
  'link',
  'Liquidación de Horas Extras',
  'Cálculo y liquidación de horas extras a pagar'
);