-- Mover "Aprobar Fotos Faciales" como hijo de "Panel de Administración"
UPDATE app_pages
SET parent_id = '5e797659-a24a-4268-8b89-4b378280b59c',
    orden = 1
WHERE id = '67ef3c31-11a7-404d-82d7-539a11d51104';