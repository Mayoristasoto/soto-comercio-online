-- Agregar política para que administradores de RRHH puedan ver todos los empleados
CREATE POLICY "admin_rrhh_can_view_all_employees" 
ON empleados 
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM empleados admin_emp 
    WHERE admin_emp.user_id = auth.uid() 
    AND admin_emp.rol = 'admin_rrhh' 
    AND admin_emp.activo = true
  )
);

-- Política para que administradores de RRHH puedan actualizar empleados
CREATE POLICY "admin_rrhh_can_update_employees" 
ON empleados 
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM empleados admin_emp 
    WHERE admin_emp.user_id = auth.uid() 
    AND admin_emp.rol = 'admin_rrhh' 
    AND admin_emp.activo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM empleados admin_emp 
    WHERE admin_emp.user_id = auth.uid() 
    AND admin_emp.rol = 'admin_rrhh' 
    AND admin_emp.activo = true
  )
);

-- Política para que administradores de RRHH puedan crear empleados
CREATE POLICY "admin_rrhh_can_insert_employees" 
ON empleados 
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM empleados admin_emp 
    WHERE admin_emp.user_id = auth.uid() 
    AND admin_emp.rol = 'admin_rrhh' 
    AND admin_emp.activo = true
  )
);