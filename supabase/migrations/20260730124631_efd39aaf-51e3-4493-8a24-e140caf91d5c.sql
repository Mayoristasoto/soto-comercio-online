-- 1. evaluaciones_detalles: restrict open SELECT
DROP POLICY IF EXISTS "Detalles visibles con evaluación" ON public.evaluaciones_detalles;
CREATE POLICY "Detalles visibles para involucrados"
ON public.evaluaciones_detalles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.evaluaciones_mensuales em
    WHERE em.id = evaluaciones_detalles.evaluacion_id
      AND (
        em.empleado_id = public.get_current_empleado()
        OR em.evaluador_id = public.get_current_empleado()
        OR public.current_user_is_admin()
      )
  )
);

-- 2. empleados: scope manager visibility to their own sucursal
DROP POLICY IF EXISTS "Managers can view all employees (temporary)" ON public.empleados;
CREATE POLICY "Managers can view employees of their branch"
ON public.empleados
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'gerente_sucursal'::public.user_role)
  AND sucursal_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.empleados m
    WHERE m.user_id = auth.uid()
      AND m.sucursal_id = empleados.sucursal_id
  )
);

-- 3. tablero_columnas / tablero_tarjetas: read for authenticated, write for admin/manager
DROP POLICY IF EXISTS "admins_full_columnas" ON public.tablero_columnas;
CREATE POLICY "columnas_select_authenticated"
ON public.tablero_columnas FOR SELECT TO authenticated USING (true);
CREATE POLICY "columnas_write_admin_manager"
ON public.tablero_columnas FOR ALL TO authenticated
USING (public.is_admin_or_manager())
WITH CHECK (public.is_admin_or_manager());

DROP POLICY IF EXISTS "admins_full_tarjetas" ON public.tablero_tarjetas;
CREATE POLICY "tarjetas_select_authenticated"
ON public.tablero_tarjetas FOR SELECT TO authenticated USING (true);
CREATE POLICY "tarjetas_write_admin_manager"
ON public.tablero_tarjetas FOR ALL TO authenticated
USING (public.is_admin_or_manager())
WITH CHECK (public.is_admin_or_manager());

-- 4. gondolas: restrict writes to admin/manager
DROP POLICY IF EXISTS "authenticated_users_can_insert_gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "authenticated_users_can_update_gondolas" ON public.gondolas;
DROP POLICY IF EXISTS "authenticated_users_can_delete_gondolas" ON public.gondolas;
CREATE POLICY "gondolas_insert_admin_manager"
ON public.gondolas FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_manager());
CREATE POLICY "gondolas_update_admin_manager"
ON public.gondolas FOR UPDATE TO authenticated
USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());
CREATE POLICY "gondolas_delete_admin_manager"
ON public.gondolas FOR DELETE TO authenticated USING (public.is_admin_or_manager());

-- 5. limpieza_asignaciones: remove anon read, restrict management
DROP POLICY IF EXISTS "Anon can read limpieza_asignaciones" ON public.limpieza_asignaciones;
DROP POLICY IF EXISTS "Authenticated can manage limpieza_asignaciones" ON public.limpieza_asignaciones;
REVOKE ALL ON public.limpieza_asignaciones FROM anon;
CREATE POLICY "limpieza_manage_admin_manager"
ON public.limpieza_asignaciones FOR ALL TO authenticated
USING (public.is_admin_or_manager())
WITH CHECK (public.is_admin_or_manager());

-- 6. rate limit tables: only service_role / internal definer functions may write
DROP POLICY IF EXISTS "System manages rate limits" ON public.kiosk_rate_limit;
CREATE POLICY "kiosk_rate_limit_service_only"
ON public.kiosk_rate_limit FOR ALL TO service_role
USING (true) WITH CHECK (true);
REVOKE INSERT, UPDATE, DELETE ON public.kiosk_rate_limit FROM authenticated, anon;

DROP POLICY IF EXISTS "System can insert rate limit records" ON public.facial_auth_rate_limit;
DROP POLICY IF EXISTS "System can update rate limit records" ON public.facial_auth_rate_limit;
CREATE POLICY "facial_rate_limit_service_only"
ON public.facial_auth_rate_limit FOR ALL TO service_role
USING (true) WITH CHECK (true);
REVOKE INSERT, UPDATE ON public.facial_auth_rate_limit FROM authenticated, anon;

-- 7. Fix mutable search_path on remaining functions
ALTER FUNCTION public.calcular_antiguedad_anios(date) SET search_path = public;
ALTER FUNCTION public.get_current_date_argentina() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 8. View should run with caller's permissions
ALTER VIEW public.empleados_carga_trabajo SET (security_invoker = true);

-- 9. Revoke anon EXECUTE on sensitive SECURITY DEFINER functions (kiosk/public rating paths kept)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname NOT LIKE 'kiosk\_%'
      AND p.proname NOT IN (
        'authenticate_face_kiosk','check_facial_auth_rate_limit','get_facial_config',
        'get_kiosk_config_value','get_employees_for_kiosk','get_empleados_kiosk_minimal',
        'is_valid_rating_token','get_empleado_for_rating','handle_new_user_employee'
      )
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, PUBLIC', r.sig);
  END LOOP;
END $$;

-- 10. Revoke authenticated EXECUTE on maintenance/demo-only definer functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname IN (
        'blanquear_pins_con_dni','generar_pins_masivo','insert_demo_cruces_rojas',
        'cleanup_old_rate_limits','hash_pin','crear_tareas_feriados','evaluar_puntualidad_mensual'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated, anon, PUBLIC', r.sig);
  END LOOP;
END $$;