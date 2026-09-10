GRANT SELECT ON public.insumos_catalogo TO authenticated, anon;
GRANT ALL ON public.insumos_catalogo TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.insumos_control TO authenticated;
GRANT SELECT ON public.insumos_control TO anon;
GRANT ALL ON public.insumos_control TO service_role;