REVOKE INSERT, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.telegram_solicitudes FROM authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.telegram_autorizados FROM authenticated;

GRANT SELECT, UPDATE ON public.telegram_solicitudes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_autorizados TO authenticated;