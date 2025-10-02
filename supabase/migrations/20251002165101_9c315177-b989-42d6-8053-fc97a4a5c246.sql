-- Ensure trigger function is SECURITY DEFINER and attached to empleados inserts
CREATE OR REPLACE FUNCTION public.create_empleado_sensitive_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.empleados_datos_sensibles (empleado_id)
  VALUES (NEW.id)
  ON CONFLICT (empleado_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_empleados_create_sensitive'
  ) THEN
    CREATE TRIGGER trg_empleados_create_sensitive
    AFTER INSERT ON public.empleados
    FOR EACH ROW
    EXECUTE FUNCTION public.create_empleado_sensitive_record();
  END IF;
END$$;