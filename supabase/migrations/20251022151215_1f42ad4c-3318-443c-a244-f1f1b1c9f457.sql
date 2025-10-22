-- Convertir RRHH de separator a link para que funcione como menú desplegable
UPDATE app_pages 
SET tipo = 'link'
WHERE id = '7061a2c1-b453-46ac-bad5-0715162cced7' AND nombre = 'RRHH';

-- También actualizar Reconocimiento y Operaciones si necesitan ser colapsables
UPDATE app_pages 
SET tipo = 'link'
WHERE id IN ('877159ad-a422-4a78-9ae4-f0e88ab9d2a8', '2ad11082-daf8-4fae-ad71-bdf038727604');