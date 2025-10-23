-- Corregir los paths de Fichero para usar /operaciones/fichero# en lugar de /fichero#
UPDATE app_pages SET path = '/operaciones/fichero#misfichadas' WHERE path = '/fichero#misfichadas';
UPDATE app_pages SET path = '/operaciones/fichero#estado-animo' WHERE path = '/fichero#estado-animo';
UPDATE app_pages SET path = '/operaciones/fichero#estadisticas' WHERE path = '/fichero#estadisticas';
UPDATE app_pages SET path = '/operaciones/fichero#incidencias' WHERE path = '/fichero#incidencias';
UPDATE app_pages SET path = '/operaciones/fichero#historial' WHERE path = '/fichero#historial';
UPDATE app_pages SET path = '/operaciones/fichero#horarios' WHERE path = '/fichero#horarios';
UPDATE app_pages SET path = '/operaciones/fichero#config' WHERE path = '/fichero#config';
UPDATE app_pages SET path = '/operaciones/fichero#admin' WHERE path = '/fichero#admin';

-- También actualizar el path principal de Fichero si existe con /fichero
UPDATE app_pages SET path = '/operaciones/fichero' WHERE path = '/fichero' AND nombre = 'Fichero';