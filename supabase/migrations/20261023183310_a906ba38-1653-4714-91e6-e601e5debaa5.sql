INSERT INTO public.app_pages (path,nombre,titulo_pagina,parent_id,descripcion,icon,orden,visible,requiere_auth,roles_permitidos,mostrar_en_sidebar,tipo)
SELECT '/operaciones/fichero#descansos','Descansos','Reporte de descansos',p.id,'Mapa diario, línea de tiempo y exportación de descansos','Clock',9,true,true,ARRAY['admin_rrhh']::public.user_role[],true,'link'
FROM public.app_pages p WHERE p.path='/operaciones/fichero'
AND NOT EXISTS (SELECT 1 FROM public.app_pages WHERE path='/operaciones/fichero#descansos');
UPDATE public.app_pages SET nombre='Descansos',parent_id=(SELECT id FROM public.app_pages WHERE path='/operaciones/fichero' LIMIT 1),visible=true,mostrar_en_sidebar=true,updated_at=now() WHERE path='/operaciones/fichero#descansos';