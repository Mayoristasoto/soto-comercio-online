-- =====================================================
-- CORRECCIONES DE SEGURIDAD - PAYROLL
-- =====================================================

-- 1. Recrear vista sin SECURITY DEFINER
DROP VIEW IF EXISTS public.empleados_payroll_completo;

CREATE VIEW public.empleados_payroll_completo 
WITH (security_invoker = true) AS
SELECT 
  e.id,
  e.nombre,
  e.apellido,
  e.email,
  e.legajo,
  e.dni,
  e.fecha_ingreso,
  e.rol,
  e.sucursal_id,
  e.activo,
  e.puesto,
  ecp.convenio_id,
  cc.codigo as convenio_codigo,
  cc.nombre as convenio_nombre,
  cc.horas_mensuales,
  ecp.categoria,
  ecp.porcentaje_obra_social,
  ecp.porcentaje_sindicato,
  ecp.banco,
  ecp.cbu,
  ecp.forma_pago,
  ecp.exento_ganancias,
  ecp.cargas_familia,
  eds.salario as sueldo_basico
FROM public.empleados e
LEFT JOIN public.empleados_configuracion_payroll ecp ON e.id = ecp.empleado_id
LEFT JOIN public.convenios_colectivos cc ON ecp.convenio_id = cc.id
LEFT JOIN public.empleados_datos_sensibles eds ON e.id = eds.empleado_id
WHERE e.activo = true;

-- 2. Agregar search_path a funciones existentes que lo necesiten
-- (Solo para las funciones que no tienen search_path establecido)

-- Verificar y actualizar función update_updated_at_column si existe y no tiene search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;