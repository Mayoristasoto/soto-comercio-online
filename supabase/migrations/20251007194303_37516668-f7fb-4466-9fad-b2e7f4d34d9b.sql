-- Add RLS policies for admin to manage documentos_obligatorios
CREATE POLICY "Admin puede crear documentos obligatorios" 
ON public.documentos_obligatorios 
FOR INSERT 
WITH CHECK (current_user_is_admin());

CREATE POLICY "Admin puede actualizar documentos obligatorios" 
ON public.documentos_obligatorios 
FOR UPDATE 
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

CREATE POLICY "Admin puede eliminar documentos obligatorios" 
ON public.documentos_obligatorios 
FOR DELETE 
USING (current_user_is_admin());

CREATE POLICY "Admin puede ver todos los documentos obligatorios" 
ON public.documentos_obligatorios 
FOR SELECT 
USING (current_user_is_admin());