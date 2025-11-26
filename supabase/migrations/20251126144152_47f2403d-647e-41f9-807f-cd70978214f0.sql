-- Fix imagenes_cumpleanos RLS policy to use secure has_role() function
-- This prevents recursive RLS issues and follows security best practices

-- Drop the insecure policy
DROP POLICY IF EXISTS "Admin RRHH puede gestionar imágenes" ON public.imagenes_cumpleanos;

-- Create secure policy using has_role() function
CREATE POLICY "Admin RRHH puede gestionar imágenes"
  ON public.imagenes_cumpleanos
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin_rrhh'));
