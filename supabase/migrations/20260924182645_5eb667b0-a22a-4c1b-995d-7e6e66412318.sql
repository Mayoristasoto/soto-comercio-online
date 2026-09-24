CREATE TABLE public.pin_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL,
  evento text NOT NULL,
  detalle text,
  intentos_fallidos integer,
  realizado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pin_eventos_emp ON public.pin_eventos(empleado_id, created_at DESC);
GRANT SELECT ON public.pin_eventos TO authenticated;
GRANT ALL ON public.pin_eventos TO service_role;
ALTER TABLE public.pin_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin RRHH ve log de PIN" ON public.pin_eventos FOR SELECT TO authenticated USING (public.current_user_is_admin());

CREATE OR REPLACE FUNCTION public.log_pin_eventos() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO pin_eventos(empleado_id, evento, detalle, realizado_por) VALUES (NEW.empleado_id, 'pin_creado', 'PIN asignado', auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO pin_eventos(empleado_id, evento, detalle, realizado_por) VALUES (OLD.empleado_id, 'pin_eliminado', 'PIN eliminado', auth.uid());
    RETURN OLD;
  END IF;
  IF NEW.pin_hash IS DISTINCT FROM OLD.pin_hash THEN
    INSERT INTO pin_eventos(empleado_id, evento, detalle, realizado_por) VALUES (NEW.empleado_id, 'pin_cambiado', 'PIN cambiado o blanqueado', auth.uid());
  END IF;
  IF coalesce(NEW.intentos_fallidos,0) > coalesce(OLD.intentos_fallidos,0) THEN
    INSERT INTO pin_eventos(empleado_id, evento, detalle, intentos_fallidos, realizado_por) VALUES (NEW.empleado_id, 'intento_fallido', 'PIN incorrecto', NEW.intentos_fallidos, auth.uid());
  END IF;
  IF NEW.ultimo_uso IS DISTINCT FROM OLD.ultimo_uso AND NEW.ultimo_uso IS NOT NULL THEN
    INSERT INTO pin_eventos(empleado_id, evento, detalle, realizado_por) VALUES (NEW.empleado_id, 'ingreso_ok', 'PIN correcto', auth.uid());
  END IF;
  IF NEW.bloqueado_hasta IS NOT NULL AND OLD.bloqueado_hasta IS DISTINCT FROM NEW.bloqueado_hasta THEN
    INSERT INTO pin_eventos(empleado_id, evento, detalle, realizado_por) VALUES (NEW.empleado_id, 'bloqueado', 'Bloqueado hasta ' || to_char(NEW.bloqueado_hasta AT TIME ZONE 'America/Argentina/Buenos_Aires','DD/MM HH24:MI'), auth.uid());
  ELSIF NEW.bloqueado_hasta IS NULL AND OLD.bloqueado_hasta IS NOT NULL THEN
    INSERT INTO pin_eventos(empleado_id, evento, detalle, realizado_por) VALUES (NEW.empleado_id, 'desbloqueado', 'PIN desbloqueado', auth.uid());
  END IF;
  IF coalesce(NEW.activo,true) IS DISTINCT FROM coalesce(OLD.activo,true) THEN
    INSERT INTO pin_eventos(empleado_id, evento, detalle, realizado_por) VALUES (NEW.empleado_id, CASE WHEN NEW.activo THEN 'activado' ELSE 'desactivado' END, NULL, auth.uid());
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.log_pin_eventos() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_log_pin_eventos AFTER INSERT OR UPDATE OR DELETE ON public.empleados_pin FOR EACH ROW EXECUTE FUNCTION public.log_pin_eventos();