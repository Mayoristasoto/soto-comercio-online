REVOKE EXECUTE ON FUNCTION public.docs_ingreso_empleado(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.docs_ingreso_empleado(uuid) TO authenticated;