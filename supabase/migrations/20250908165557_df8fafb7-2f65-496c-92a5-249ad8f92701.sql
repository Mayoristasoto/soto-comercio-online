-- Create more granular financial access control
-- Add financial admin role to existing enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin_financiero';

-- Create function to check financial management permissions
CREATE OR REPLACE FUNCTION public.is_financial_manager()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM public.empleados 
    WHERE user_id = auth.uid() 
    AND rol IN ('admin_rrhh', 'admin_financiero')
    AND activo = true
  );
$function$;

-- Update RLS policies for presupuesto_empresa to be more restrictive
DROP POLICY IF EXISTS "Admins pueden gestionar presupuesto" ON public.presupuesto_empresa;

CREATE POLICY "Solo administradores financieros pueden gestionar presupuesto" 
ON public.presupuesto_empresa 
FOR ALL 
USING (is_financial_manager())
WITH CHECK (is_financial_manager());

-- Create read-only policy for senior managers to view budget summaries
CREATE POLICY "Gerentes pueden ver resumen de presupuesto" 
ON public.presupuesto_empresa 
FOR SELECT 
USING (
  is_gerente_sucursal() AND 
  -- Only allow viewing current month and year summary data
  anio = EXTRACT(YEAR FROM CURRENT_DATE) AND
  mes = EXTRACT(MONTH FROM CURRENT_DATE)
);

-- Update the budget summary function to be more secure
CREATE OR REPLACE FUNCTION public.get_presupuesto_resumen()
RETURNS TABLE(mes_actual numeric, anual numeric, disponible_mes numeric, utilizado_mes numeric, porcentaje_utilizado numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- Only return data if user has financial management permissions
  SELECT 
    CASE WHEN is_financial_manager() THEN
      (WITH presupuesto_mes AS (
        SELECT 
          presupuesto_inicial,
          presupuesto_disponible,
          presupuesto_utilizado
        FROM public.presupuesto_empresa
        WHERE anio = EXTRACT(YEAR FROM CURRENT_DATE)
          AND mes = EXTRACT(MONTH FROM CURRENT_DATE)
          AND activo = true
        LIMIT 1
      ),
      presupuesto_anual AS (
        SELECT 
          COALESCE(SUM(presupuesto_inicial), 0) as total_anual,
          COALESCE(SUM(presupuesto_utilizado), 0) as utilizado_anual
        FROM public.presupuesto_empresa
        WHERE anio = EXTRACT(YEAR FROM CURRENT_DATE)
          AND activo = true
      )
      SELECT 
        COALESCE(pm.presupuesto_inicial, 0),
        pa.total_anual,
        COALESCE(pm.presupuesto_disponible, 0),
        COALESCE(pm.presupuesto_utilizado, 0),
        CASE 
          WHEN COALESCE(pm.presupuesto_inicial, 0) > 0 
          THEN ROUND((COALESCE(pm.presupuesto_utilizado, 0) / pm.presupuesto_inicial) * 100, 2)
          ELSE 0
        END
      FROM presupuesto_mes pm
      CROSS JOIN presupuesto_anual pa)
    ELSE (0, 0, 0, 0, 0)::record
    END.*;
$function$;

-- Add audit logging for budget access
CREATE TABLE IF NOT EXISTS public.budget_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.budget_access_log ENABLE ROW LEVEL SECURITY;

-- Only financial managers can view audit logs
CREATE POLICY "Solo administradores financieros pueden ver logs de presupuesto"
ON public.budget_access_log
FOR SELECT
USING (is_financial_manager());

-- Create function to log budget access
CREATE OR REPLACE FUNCTION public.log_budget_access(
  p_action TEXT,
  p_details JSONB DEFAULT '{}',
  p_ip INET DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.budget_access_log (user_id, action, details, ip_address)
  VALUES (auth.uid(), p_action, p_details, p_ip);
END;
$function$;