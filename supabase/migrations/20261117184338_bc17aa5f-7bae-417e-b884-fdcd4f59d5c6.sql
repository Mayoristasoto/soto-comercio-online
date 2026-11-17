INSERT INTO public.app_pages (path, nombre, parent_id, icon, orden, roles_permitidos, visible)
SELECT '/rrhh/seleccion', 'Selección / ATS', parent_id, 'Briefcase', 2, roles_permitidos, true
FROM public.app_pages WHERE path='/rrhh/entrevistas' AND NOT EXISTS (SELECT 1 FROM public.app_pages WHERE path='/rrhh/seleccion');