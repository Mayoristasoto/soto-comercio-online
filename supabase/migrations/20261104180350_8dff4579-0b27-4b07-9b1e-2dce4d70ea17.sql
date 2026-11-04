REVOKE ALL ON public.telegram_autorizados FROM anon, public;
REVOKE ALL ON public.telegram_solicitudes FROM anon, public;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_autorizados TO authenticated;
GRANT SELECT, UPDATE ON public.telegram_solicitudes TO authenticated;

GRANT ALL ON public.telegram_autorizados TO service_role;
GRANT ALL ON public.telegram_solicitudes TO service_role;