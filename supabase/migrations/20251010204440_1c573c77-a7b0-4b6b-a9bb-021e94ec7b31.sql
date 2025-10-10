-- Agregar políticas RLS para fichaje_auditoria

-- Permitir a todos los usuarios autenticados insertar registros de auditoría
CREATE POLICY "Usuarios autenticados pueden insertar auditoría"
ON public.fichaje_auditoria
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir a administradores ver toda la auditoría
CREATE POLICY "Admins pueden ver auditoría"
ON public.fichaje_auditoria
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM empleados e
    WHERE e.user_id = auth.uid()
    AND e.rol = 'admin_rrhh'
    AND e.activo = true
  )
);