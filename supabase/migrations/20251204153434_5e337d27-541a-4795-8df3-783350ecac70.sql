-- Add missing RLS policies for evaluaciones_capacitacion table
CREATE POLICY "Admin puede gestionar evaluaciones capacitacion" 
ON public.evaluaciones_capacitacion 
FOR ALL 
TO authenticated
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());

-- Add missing RLS policies for preguntas_evaluacion if needed
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'preguntas_evaluacion' 
    AND policyname = 'Admin puede gestionar preguntas'
  ) THEN
    CREATE POLICY "Admin puede gestionar preguntas" 
    ON public.preguntas_evaluacion 
    FOR ALL 
    TO authenticated
    USING (current_user_is_admin())
    WITH CHECK (current_user_is_admin());
  END IF;
END $$;

-- Add missing RLS policies for materiales_capacitacion if needed
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'materiales_capacitacion' 
    AND policyname = 'Admin puede gestionar materiales'
  ) THEN
    CREATE POLICY "Admin puede gestionar materiales" 
    ON public.materiales_capacitacion 
    FOR ALL 
    TO authenticated
    USING (current_user_is_admin())
    WITH CHECK (current_user_is_admin());
  END IF;
END $$;

-- Ensure users can see questions for assigned trainings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'preguntas_evaluacion' 
    AND policyname = 'Usuarios pueden ver preguntas de evaluaciones asignadas'
  ) THEN
    CREATE POLICY "Usuarios pueden ver preguntas de evaluaciones asignadas" 
    ON public.preguntas_evaluacion 
    FOR SELECT 
    TO authenticated
    USING (
      evaluacion_id IN (
        SELECT ec.id FROM evaluaciones_capacitacion ec
        WHERE ec.capacitacion_id IN (
          SELECT ac.capacitacion_id FROM asignaciones_capacitacion ac
          WHERE ac.empleado_id = get_current_empleado()
        )
      )
    );
  END IF;
END $$;