-- Add RLS policies for empleados_datos_sensibles table to allow admin operations

-- Allow admin_rrhh and gerente_sucursal to insert sensitive employee data
CREATE POLICY "Admin roles can insert sensitive employee data"
ON public.empleados_datos_sensibles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.empleados
    WHERE empleados.user_id = auth.uid()
    AND empleados.rol IN ('admin_rrhh', 'gerente_sucursal')
  )
);

-- Allow admin_rrhh and gerente_sucursal to view sensitive employee data
CREATE POLICY "Admin roles can view sensitive employee data"
ON public.empleados_datos_sensibles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.empleados
    WHERE empleados.user_id = auth.uid()
    AND empleados.rol IN ('admin_rrhh', 'gerente_sucursal')
  )
);

-- Allow admin_rrhh and gerente_sucursal to update sensitive employee data
CREATE POLICY "Admin roles can update sensitive employee data"
ON public.empleados_datos_sensibles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.empleados
    WHERE empleados.user_id = auth.uid()
    AND empleados.rol IN ('admin_rrhh', 'gerente_sucursal')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.empleados
    WHERE empleados.user_id = auth.uid()
    AND empleados.rol IN ('admin_rrhh', 'gerente_sucursal')
  )
);

-- Allow employees to view their own sensitive data
CREATE POLICY "Employees can view their own sensitive data"
ON public.empleados_datos_sensibles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.empleados
    WHERE empleados.id = empleados_datos_sensibles.empleado_id
    AND empleados.user_id = auth.uid()
  )
);