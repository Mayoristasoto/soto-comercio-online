-- Allow managers and admins to view verification photos
CREATE POLICY "Managers can view verification photos from their branch" 
ON public.fichajes_fotos_verificacion 
FOR SELECT 
USING (is_admin_or_manager() = true);