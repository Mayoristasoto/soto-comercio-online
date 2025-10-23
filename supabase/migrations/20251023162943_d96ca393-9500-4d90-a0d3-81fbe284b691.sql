-- Actualizar rutas de sublinks de Fichero para usar hash navigation

UPDATE sidebar_links 
SET path = '/fichero#misfichadas', updated_at = now()
WHERE label = 'Informe' AND path LIKE '%fichero/informe%';

UPDATE sidebar_links 
SET path = '/fichero#estado-animo', updated_at = now()
WHERE label = 'Estado de Ánimo' AND path LIKE '%fichero/estado-animo%';

UPDATE sidebar_links 
SET path = '/fichero#estadisticas', updated_at = now()
WHERE label = 'Estadísticas' AND path LIKE '%fichero/estadisticas%';

UPDATE sidebar_links 
SET path = '/fichero#incidencias', updated_at = now()
WHERE label = 'Incidencias' AND path LIKE '%fichero/incidencias%';

UPDATE sidebar_links 
SET path = '/fichero#historial', updated_at = now()
WHERE label = 'Historial' AND path LIKE '%fichero/historial%';

UPDATE sidebar_links 
SET path = '/fichero#horarios', updated_at = now()
WHERE label = 'Horarios' AND path LIKE '%fichero/horarios%';

UPDATE sidebar_links 
SET path = '/fichero#config', updated_at = now()
WHERE label = 'Configuración' AND (path LIKE '%fichero/config%' OR path LIKE '%fichero/configuracion%');

UPDATE sidebar_links 
SET path = '/fichero#admin', updated_at = now()
WHERE label = 'Administrar' AND path LIKE '%fichero/admin%';