-- Agregar campo para controlar cambio de contraseña obligatorio
ALTER TABLE public.empleados 
ADD COLUMN debe_cambiar_password BOOLEAN NOT NULL DEFAULT false;

-- Comentario explicativo
COMMENT ON COLUMN public.empleados.debe_cambiar_password IS 'Indica si el empleado debe cambiar su contraseña en el próximo inicio de sesión';