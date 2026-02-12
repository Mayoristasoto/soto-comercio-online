UPDATE empleados_pin 
SET pin_hash = crypt('9221', gen_salt('bf')),
    intentos_fallidos = 0,
    bloqueado_hasta = NULL,
    updated_at = now()
WHERE empleado_id = '1607f6ba-046c-466d-8b4d-acc18e2acfa4';