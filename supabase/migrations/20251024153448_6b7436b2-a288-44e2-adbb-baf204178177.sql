-- Agregar políticas RLS para fichado_turnos

-- Permitir a todos los usuarios autenticados ver los turnos
CREATE POLICY "Usuarios autenticados pueden ver turnos"
ON public.fichado_turnos
FOR SELECT
TO authenticated
USING (true);

-- Permitir a admins y gerentes crear turnos
CREATE POLICY "Admins y gerentes pueden crear turnos"
ON public.fichado_turnos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.empleados
    WHERE user_id = auth.uid()
    AND rol IN ('admin_rrhh', 'gerente_sucursal')
    AND activo = true
  )
);

-- Permitir a admins y gerentes actualizar turnos
CREATE POLICY "Admins y gerentes pueden actualizar turnos"
ON public.fichado_turnos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.empleados
    WHERE user_id = auth.uid()
    AND rol IN ('admin_rrhh', 'gerente_sucursal')
    AND activo = true
  )
);

-- Permitir a admins eliminar turnos
CREATE POLICY "Admins pueden eliminar turnos"
ON public.fichado_turnos
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.empleados
    WHERE user_id = auth.uid()
    AND rol = 'admin_rrhh'
    AND activo = true
  )
);