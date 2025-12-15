-- Permitir que el kiosco (sin login) pueda listar empleados desde la vista mínima
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.empleados_kiosk_minimal TO anon;

-- Mantener también acceso para usuarios autenticados
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.empleados_kiosk_minimal TO authenticated;