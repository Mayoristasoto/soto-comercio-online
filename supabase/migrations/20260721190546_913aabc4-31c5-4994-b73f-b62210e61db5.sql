INSERT INTO public.empleados_pin (empleado_id, pin_hash, activo, intentos_fallidos, bloqueado_hasta, created_at, updated_at)
VALUES ('c36c178c-61fc-4654-8b2a-12d5daefdf8b', public.hash_pin('3531'), true, 0, NULL, now(), now())
ON CONFLICT (empleado_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, activo = true, intentos_fallidos = 0, bloqueado_hasta = NULL, updated_at = now();