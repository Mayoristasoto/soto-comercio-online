-- Add RLS policy for admins to manage capacitaciones
CREATE POLICY "Admin puede gestionar capacitaciones" 
ON public.capacitaciones 
FOR ALL 
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Also add foreign key for asignaciones_capacitacion if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'asignaciones_capacitacion_capacitacion_id_fkey'
    AND table_name = 'asignaciones_capacitacion'
  ) THEN
    ALTER TABLE public.asignaciones_capacitacion 
    ADD CONSTRAINT asignaciones_capacitacion_capacitacion_id_fkey 
    FOREIGN KEY (capacitacion_id) REFERENCES public.capacitaciones(id) ON DELETE CASCADE;
  END IF;
END $$;