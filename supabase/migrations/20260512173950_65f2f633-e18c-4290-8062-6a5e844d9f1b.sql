
INSERT INTO public.app_pages (path, nombre, titulo_pagina, descripcion, icon, orden, visible, requiere_auth, roles_permitidos, mostrar_en_sidebar, tipo)
VALUES ('/rrhh/calendarios', 'Calendarios', 'Calendarios', 'Calendarios personalizados estilo Google Calendar', 'Calendar', 50, true, true, ARRAY['admin_rrhh']::text[], true, 'link')
ON CONFLICT DO NOTHING;
