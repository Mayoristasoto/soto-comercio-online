-- Actualizar los sublinks de Fichero en app_pages para usar hash navigation
UPDATE app_pages SET path = '/fichero#misfichadas' WHERE path = '/operaciones/fichero/informe';
UPDATE app_pages SET path = '/fichero#estado-animo' WHERE path = '/operaciones/fichero/estado-animo';
UPDATE app_pages SET path = '/fichero#estadisticas' WHERE path = '/operaciones/fichero/estadisticas';
UPDATE app_pages SET path = '/fichero#incidencias' WHERE path = '/operaciones/fichero/incidencias';
UPDATE app_pages SET path = '/fichero#historial' WHERE path = '/operaciones/fichero/historial';
UPDATE app_pages SET path = '/fichero#horarios' WHERE path = '/operaciones/fichero/horarios';
UPDATE app_pages SET path = '/fichero#config' WHERE path = '/operaciones/fichero/configuracion';
UPDATE app_pages SET path = '/fichero#admin' WHERE path = '/operaciones/fichero/administrar';