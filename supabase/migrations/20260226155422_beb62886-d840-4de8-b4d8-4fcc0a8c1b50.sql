INSERT INTO app_pages (nombre, path, icon, orden, parent_id, visible, requiere_auth, roles_permitidos, tipo, descripcion, mostrar_en_sidebar)
VALUES ('Confirmación Staff', '/operaciones/confirmacion-staff', 'UserCheck', 20, '2ad11082-daf8-4fae-ad71-bdf038727604', true, true, ARRAY['admin_rrhh', 'gerente_sucursal'], 'link', 'Asignar staff para domingos y feriados', true)
ON CONFLICT DO NOTHING;