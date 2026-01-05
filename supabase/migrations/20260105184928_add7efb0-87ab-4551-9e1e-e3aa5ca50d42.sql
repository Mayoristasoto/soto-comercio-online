-- Mark all non-admin employees with existing auth accounts for password change
-- This forces them to set a new secure password on next login
UPDATE empleados 
SET debe_cambiar_password = true, updated_at = now()
WHERE rol != 'admin_rrhh' 
  AND user_id IS NOT NULL 
  AND activo = true;