-- Eliminar política restrictiva y crear una más amplia para admins
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver participantes activos" ON desafios_tv_participantes;

CREATE POLICY "Admin puede ver todos los participantes TV"
  ON desafios_tv_participantes
  FOR SELECT
  USING (current_user_is_admin());

CREATE POLICY "Usuarios autenticados pueden ver participantes activos"
  ON desafios_tv_participantes
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND participa = true AND NOT current_user_is_admin());