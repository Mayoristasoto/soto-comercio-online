
-- Corregir el path del enlace de Nómina en el sidebar
UPDATE app_pages
SET path = '/rrhh/nomina'
WHERE id = '9808d20a-8b83-43d2-b724-09c0c6c0cd70'
AND nombre = 'Nómina';
