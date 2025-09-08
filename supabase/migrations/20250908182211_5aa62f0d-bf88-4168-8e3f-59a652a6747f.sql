-- Primero verificar qué usuario admin existe
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Buscar usuario con email similar a admin
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email ILIKE '%admin%' OR email ILIKE '%rrhh%'
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
        -- Actualizar el empleado admin para vincularlo
        UPDATE empleados 
        SET user_id = admin_user_id
        WHERE rol = 'admin_rrhh' AND user_id IS NULL;
        
        RAISE NOTICE 'Usuario admin vinculado: %', admin_user_id;
    ELSE
        RAISE NOTICE 'No se encontró usuario admin en auth.users';
    END IF;
END $$;