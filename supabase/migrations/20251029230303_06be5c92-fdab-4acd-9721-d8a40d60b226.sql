-- Permitir a admin_rrhh eliminar incidencias
CREATE POLICY "Admin RRHH puede eliminar incidencias"
ON fichaje_incidencias
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid()
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
);