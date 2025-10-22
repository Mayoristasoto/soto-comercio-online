-- Transferir registros faciales de vera@soto.com a jonathanvera@mayoristasoto.com

-- Paso 1: Desactivar el acceso del usuario antiguo (vera@soto.com) primero
UPDATE empleados
SET user_id = NULL, activo = false
WHERE email = 'vera@soto.com';

-- Paso 2: Asignar el user_id de vera@soto.com a jonathanvera@mayoristasoto.com
UPDATE empleados 
SET user_id = '0f6a0381-e3e5-4c90-ba9a-43fa17593dfe'
WHERE email = 'jonathanvera@mayoristasoto.com';

-- Paso 3: Transferir los registros faciales de empleados_rostros
UPDATE empleados_rostros
SET empleado_id = (SELECT id FROM empleados WHERE email = 'jonathanvera@mayoristasoto.com')
WHERE empleado_id = (SELECT id FROM empleados WHERE email = 'vera@soto.com');