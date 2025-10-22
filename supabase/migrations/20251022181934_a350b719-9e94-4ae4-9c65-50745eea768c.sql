-- Transferir registros faciales de vera@soto.com a jonathanvera@mayoristasoto.com
-- Orden correcto para evitar violación de constraint único

-- Paso 1: Desactivar el acceso del usuario antiguo (vera@soto.com) y liberar el user_id
UPDATE empleados
SET user_id = NULL, activo = false
WHERE email = 'vera@soto.com';

-- Paso 2: Asignar el user_id de vera@soto.com a jonathanvera@mayoristasoto.com
UPDATE empleados 
SET user_id = '0f6a0381-e3e5-4c90-ba9a-43fa17593dfe', activo = true
WHERE email = 'jonathanvera@mayoristasoto.com';

-- Paso 3: Transferir los registros faciales de empleados_rostros
UPDATE empleados_rostros
SET empleado_id = (SELECT id FROM empleados WHERE email = 'jonathanvera@mayoristasoto.com')
WHERE empleado_id = (SELECT id FROM empleados WHERE email = 'vera@soto.com');