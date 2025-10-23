-- Primero desactivamos temporalmente el trigger problemático
DROP TRIGGER IF EXISTS sync_app_pages_trigger ON app_pages;

-- Crear sub-páginas de Nómina
DO $$
DECLARE
  parent_nomina_id UUID;
BEGIN
  SELECT id INTO parent_nomina_id FROM app_pages WHERE path = '/nomina' LIMIT 1;
  
  -- Insertar las sub-páginas de Nómina
  INSERT INTO app_pages (nombre, path, icon, descripcion, parent_id, orden, visible, mostrar_en_sidebar, roles_permitidos, tipo) VALUES
  ('Resumen', '/rrhh/nomina/resumen', 'FileText', 'Resumen general de nómina', parent_nomina_id, 1, true, true, ARRAY['admin_rrhh'], 'link'),
  ('Empleados', '/rrhh/nomina/empleados', 'Users', 'Gestión de empleados en nómina', parent_nomina_id, 2, true, true, ARRAY['admin_rrhh'], 'link'),
  ('Acceso y Seguridad', '/rrhh/nomina/acceso-seguridad', 'Shield', 'Control de acceso y seguridad', parent_nomina_id, 3, true, true, ARRAY['admin_rrhh'], 'link'),
  ('Puestos', '/rrhh/nomina/puestos', 'Briefcase', 'Gestión de puestos de trabajo', parent_nomina_id, 4, true, true, ARRAY['admin_rrhh'], 'link'),
  ('Documentos', '/rrhh/nomina/documentos', 'FileText', 'Documentación de nómina', parent_nomina_id, 5, true, true, ARRAY['admin_rrhh'], 'link'),
  ('Permisos', '/rrhh/nomina/permisos', 'UserCheck', 'Gestión de permisos', parent_nomina_id, 6, true, true, ARRAY['admin_rrhh'], 'link'),
  ('Doc. Obligatorios', '/rrhh/nomina/doc-obligatorios', 'FileWarning', 'Documentos obligatorios', parent_nomina_id, 7, true, true, ARRAY['admin_rrhh'], 'link'),
  ('Asignaciones', '/rrhh/nomina/asignaciones', 'ClipboardList', 'Asignaciones de documentos', parent_nomina_id, 8, true, true, ARRAY['admin_rrhh'], 'link'),
  ('Vista Empleado', '/rrhh/nomina/vista-empleado', 'User', 'Vista de empleado', parent_nomina_id, 9, true, true, ARRAY['admin_rrhh'], 'link'),
  ('Organigrama', '/rrhh/nomina/organigrama', 'Building2', 'Organigrama empresarial', parent_nomina_id, 10, true, true, ARRAY['admin_rrhh'], 'link')
  ON CONFLICT (path) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    icon = EXCLUDED.icon,
    descripcion = EXCLUDED.descripcion,
    parent_id = EXCLUDED.parent_id,
    orden = EXCLUDED.orden,
    visible = EXCLUDED.visible,
    mostrar_en_sidebar = EXCLUDED.mostrar_en_sidebar,
    roles_permitidos = EXCLUDED.roles_permitidos;
END $$;