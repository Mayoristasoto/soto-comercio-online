-- Políticas RLS para liquidaciones_mensuales
CREATE POLICY "payroll_managers_select_liquidaciones"
  ON public.liquidaciones_mensuales FOR SELECT
  TO authenticated
  USING (can_manage_payroll());

CREATE POLICY "payroll_managers_insert_liquidaciones"
  ON public.liquidaciones_mensuales FOR INSERT
  TO authenticated
  WITH CHECK (can_manage_payroll());

CREATE POLICY "payroll_managers_update_liquidaciones"
  ON public.liquidaciones_mensuales FOR UPDATE
  TO authenticated
  USING (can_manage_payroll());

-- Políticas RLS para recibos_sueldo
CREATE POLICY "employees_select_own_recibos"
  ON public.recibos_sueldo FOR SELECT
  TO authenticated
  USING (empleado_id = get_current_empleado() OR can_manage_payroll());

CREATE POLICY "payroll_managers_insert_recibos"
  ON public.recibos_sueldo FOR INSERT
  TO authenticated
  WITH CHECK (can_manage_payroll());

CREATE POLICY "payroll_managers_update_recibos"
  ON public.recibos_sueldo FOR UPDATE
  TO authenticated
  USING (can_manage_payroll());