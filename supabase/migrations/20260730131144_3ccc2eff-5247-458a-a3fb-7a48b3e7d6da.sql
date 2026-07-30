CREATE OR REPLACE FUNCTION public.current_user_sucursal_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sucursal_id FROM public.empleados WHERE user_id = auth.uid() LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_user_sucursal_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_sucursal_id() TO authenticated, service_role;

DROP POLICY IF EXISTS "Managers can view employees of their branch" ON public.empleados;

CREATE POLICY "Managers can view employees of their branch"
ON public.empleados
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'gerente_sucursal'::user_role)
  AND sucursal_id IS NOT NULL
  AND sucursal_id = public.current_user_sucursal_id()
);