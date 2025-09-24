-- Add missing permissions for admin_rrhh users
INSERT INTO empleado_permisos (empleado_id, modulo, permiso, habilitado) VALUES 
-- Add nomina module permissions
('fe7c1d88-dd1d-460b-99d6-7435c9c93b58', 'nomina', 'view', true),
('fe7c1d88-dd1d-460b-99d6-7435c9c93b58', 'nomina', 'edit', true),
('fe7c1d88-dd1d-460b-99d6-7435c9c93b58', 'nomina', 'manage', true),
-- Add admin module permissions
('fe7c1d88-dd1d-460b-99d6-7435c9c93b58', 'admin', 'full_access', true),
('fe7c1d88-dd1d-460b-99d6-7435c9c93b58', 'admin', 'change_passwords', true),
-- Add system permissions
('fe7c1d88-dd1d-460b-99d6-7435c9c93b58', 'system', 'admin', true)
ON CONFLICT (empleado_id, modulo, permiso) DO UPDATE SET habilitado = true;