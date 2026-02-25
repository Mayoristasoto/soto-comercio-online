
-- Insert parent "Finanzas" group
INSERT INTO public.app_pages (nombre, path, icon, orden, visible, requiere_auth, roles_permitidos, mostrar_en_sidebar, tipo, titulo_pagina, descripcion)
VALUES ('Finanzas', '/finanzas', 'DollarSign', 50, true, true, ARRAY['admin_rrhh'], true, 'link', 'Finanzas', 'Módulo financiero y rentabilidad');

-- Insert child "Rentabilidad"
INSERT INTO public.app_pages (nombre, path, icon, orden, visible, requiere_auth, roles_permitidos, mostrar_en_sidebar, tipo, titulo_pagina, descripcion, parent_id)
VALUES ('Rentabilidad', '/finanzas/rentabilidad', 'TrendingUp', 1, true, true, ARRAY['admin_rrhh'], true, 'link', 'Rentabilidad por Sucursal', 'Gestión de rentabilidad y costos por sucursal',
  (SELECT id FROM public.app_pages WHERE nombre = 'Finanzas' AND path = '/finanzas' LIMIT 1));
