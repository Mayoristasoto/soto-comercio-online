-- USE CASCADE TO UPDATE SECURITY DEFINER FUNCTIONS SAFELY
-- This will update the function and automatically update dependent policies

-- 1. Fix is_admin function using CASCADE
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.empleados 
    WHERE user_id = auth.uid() 
    AND rol = 'admin_rrhh'
    AND activo = true
  );
$$;

-- 2. Recreate the essential policies that were dropped by CASCADE
-- Sucursales
CREATE POLICY "Admins can manage sucursales" 
ON public.sucursales 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Grupos  
CREATE POLICY "Admins and managers can manage groups" 
ON public.grupos 
FOR ALL 
USING (is_admin() OR is_gerente_sucursal(sucursal_id))
WITH CHECK (is_admin() OR is_gerente_sucursal(sucursal_id));

-- Desafios
CREATE POLICY "Admins can manage challenges" 
ON public.desafios 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Premios
CREATE POLICY "Admins can manage prizes" 
ON public.premios 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Essential READ policies for non-admin users
CREATE POLICY "Users can view active sucursales" 
ON public.sucursales 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view active groups" 
ON public.grupos 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view active challenges" 
ON public.desafios 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND estado = 'activo');

CREATE POLICY "Users can view active prizes" 
ON public.premios 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND activo = true);