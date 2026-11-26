ALTER TABLE public.notificaciones ADD COLUMN IF NOT EXISTS telegram_pendiente boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_notif_tg_pend ON public.notificaciones(telegram_pendiente) WHERE telegram_pendiente;
CREATE OR REPLACE FUNCTION public.notif_marcar_telegram()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN IF NEW.tipo LIKE 'solicitud\_%' THEN NEW.telegram_pendiente := true; END IF; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_notif_marcar_tg ON public.notificaciones;
CREATE TRIGGER trg_notif_marcar_tg BEFORE INSERT ON public.notificaciones FOR EACH ROW EXECUTE FUNCTION public.notif_marcar_telegram();
REVOKE EXECUTE ON FUNCTION public.notificar_rrhh_nueva_solicitud() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notif_marcar_telegram() FROM PUBLIC, anon, authenticated;