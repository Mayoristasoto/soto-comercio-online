-- Enable RLS and add permissive policies for document assignments
-- This allows admins and managers to create assignments from the admin UI

-- Ensure RLS is enabled on the table
ALTER TABLE public.asignaciones_documentos_obligatorios ENABLE ROW LEVEL SECURITY;

-- Allow admins or managers to INSERT new assignments
CREATE POLICY "Admins or managers can insert document assignments"
ON public.asignaciones_documentos_obligatorios
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_manager());

-- Allow admins or managers to SELECT all assignments (admin views)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'asignaciones_documentos_obligatorios' 
      AND policyname = 'Admins or managers can select document assignments'
  ) THEN
    CREATE POLICY "Admins or managers can select document assignments"
    ON public.asignaciones_documentos_obligatorios
    FOR SELECT
    TO authenticated
    USING (public.is_admin_or_manager());
  END IF;
END $$;

-- Allow employees to SELECT their own assignments (for employee-facing views)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'asignaciones_documentos_obligatorios' 
      AND policyname = 'Employees can view their own document assignments'
  ) THEN
    CREATE POLICY "Employees can view their own document assignments"
    ON public.asignaciones_documentos_obligatorios
    FOR SELECT
    TO authenticated
    USING (empleado_id = public.get_current_empleado());
  END IF;
END $$;
