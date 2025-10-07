-- RLS policies to allow managers and admins to approve vacation requests
-- Safely create policies only if they don't already exist

-- Admins manage all
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'solicitudes_vacaciones' 
      AND policyname = 'Admins can manage all vacation requests'
  ) THEN
    CREATE POLICY "Admins can manage all vacation requests"
    ON public.solicitudes_vacaciones
    FOR ALL
    USING (current_user_is_admin())
    WITH CHECK (current_user_is_admin());
  END IF;
END $$;

-- Managers can view requests for their branch
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'solicitudes_vacaciones' 
      AND policyname = 'Managers can view branch vacation requests'
  ) THEN
    CREATE POLICY "Managers can view branch vacation requests"
    ON public.solicitudes_vacaciones
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.empleados e_mgr
        JOIN public.empleados e_emp ON e_mgr.sucursal_id = e_emp.sucursal_id
        WHERE e_mgr.user_id = auth.uid()
          AND e_mgr.rol = 'gerente_sucursal'
          AND e_mgr.activo = true
          AND e_emp.id = solicitudes_vacaciones.empleado_id
      )
    );
  END IF;
END $$;

-- Managers can approve (update) requests for their branch
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'solicitudes_vacaciones' 
      AND policyname = 'Managers can approve branch vacation requests'
  ) THEN
    CREATE POLICY "Managers can approve branch vacation requests"
    ON public.solicitudes_vacaciones
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1
        FROM public.empleados e_mgr
        JOIN public.empleados e_emp ON e_mgr.sucursal_id = e_emp.sucursal_id
        WHERE e_mgr.user_id = auth.uid()
          AND e_mgr.rol = 'gerente_sucursal'
          AND e_mgr.activo = true
          AND e_emp.id = solicitudes_vacaciones.empleado_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.empleados e
        WHERE e.user_id = auth.uid()
          AND e.rol = 'gerente_sucursal'
          AND e.activo = true
      )
    );
  END IF;
END $$;