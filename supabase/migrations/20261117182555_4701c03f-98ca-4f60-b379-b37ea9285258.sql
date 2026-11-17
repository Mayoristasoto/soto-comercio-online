REVOKE EXECUTE ON FUNCTION public.ats_busquedas_publicas() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.ats_busquedas_publicas() TO service_role;
CREATE INDEX ON public.ats_busquedas(puesto_id);
CREATE INDEX ON public.ats_busquedas(sucursal_id);
CREATE INDEX ON public.ats_criterios(busqueda_id);
CREATE INDEX ON public.ats_observaciones(postulacion_id);