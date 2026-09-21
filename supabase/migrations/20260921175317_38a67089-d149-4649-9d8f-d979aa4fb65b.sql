INSERT INTO public.empleados (nombre, apellido, email, rol, dni, cuil, fecha_ingreso, tipo_jornada, dias_laborales_semana, activo) VALUES
  ('Romina Jesica', 'Palma', 'romina.palma@pendiente.local', 'empleado', '33583511', '27-33583511-0', '2008-08-20', 'diaria', 6, true),
  ('Sasha Candela Alejandra', 'Palomino', 'sasha.palomino@pendiente.local', 'empleado', '42569075', '27-42569075-8', '2004-12-07', 'diaria', 6, true),
  ('Silvia Natalia Soledad', 'Estanga', 'silvia.estanga@pendiente.local', 'empleado', '32334622', '23-32334622-4', '2006-10-23', 'diaria', 6, true);

INSERT INTO public.empleados_pin (empleado_id, pin_hash, activo)
SELECT e.id, public.hash_pin(RIGHT(e.dni, 4)), true
FROM public.empleados e
WHERE e.dni IN ('33583511', '42569075', '32334622')
  AND NOT EXISTS (SELECT 1 FROM public.empleados_pin p WHERE p.empleado_id = e.id);

GRANT SELECT ON public.empleados_pin TO authenticated;