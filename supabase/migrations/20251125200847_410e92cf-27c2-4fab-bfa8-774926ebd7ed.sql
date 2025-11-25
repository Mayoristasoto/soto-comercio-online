-- Fix RLS policies for presupuesto_empresa table
-- Add policies to allow admin access

CREATE POLICY "Admin RRHH puede ver presupuestos"
  ON public.presupuesto_empresa
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin_rrhh'
      AND user_roles.is_active = true
    )
  );

CREATE POLICY "Admin RRHH puede crear presupuestos"
  ON public.presupuesto_empresa
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin_rrhh'
      AND user_roles.is_active = true
    )
  );

CREATE POLICY "Admin RRHH puede actualizar presupuestos"
  ON public.presupuesto_empresa
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin_rrhh'
      AND user_roles.is_active = true
    )
  );

-- Ensure all SECURITY DEFINER functions have fixed search_path
-- This adds SET search_path to functions that might be missing it

-- Function: update_app_pages_updated_at
CREATE OR REPLACE FUNCTION public.update_app_pages_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Function: update_notificaciones_updated_at  
CREATE OR REPLACE FUNCTION public.update_notificaciones_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Function: update_user_theme_preferences_updated_at
CREATE OR REPLACE FUNCTION public.update_user_theme_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Function: handle_new_user_employee
CREATE OR REPLACE FUNCTION public.handle_new_user_employee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE empleados 
  SET user_id = NEW.id 
  WHERE email = NEW.email AND user_id IS NULL;
  
  IF NOT FOUND THEN
    INSERT INTO empleados (
      user_id, 
      nombre, 
      apellido, 
      email, 
      rol,
      fecha_ingreso
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
      COALESCE(NEW.raw_user_meta_data->>'apellido', 'Nuevo'),
      NEW.email,
      'empleado',
      CURRENT_DATE
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Function: create_empleado_sensitive_record
CREATE OR REPLACE FUNCTION public.create_empleado_sensitive_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.empleados_datos_sensibles (empleado_id)
  VALUES (NEW.id)
  ON CONFLICT (empleado_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Function: inicializar_onboarding_empleado
CREATE OR REPLACE FUNCTION public.inicializar_onboarding_empleado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.empleado_onboarding (empleado_id)
  VALUES (NEW.id)
  ON CONFLICT (empleado_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;