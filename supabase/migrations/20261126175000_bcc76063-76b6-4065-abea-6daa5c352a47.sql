CREATE OR REPLACE FUNCTION public.notificar_rrhh_nueva_solicitud()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_nom text; v_tit text; v_msg text; v_tipo text; v_url text;
BEGIN
  SELECT nombre||' '||apellido INTO v_nom FROM empleados WHERE id = NEW.empleado_id;
  IF TG_TABLE_NAME = 'solicitudes_vacaciones' THEN
    v_tipo := 'vacaciones'; v_url := '/rrhh/vacaciones';
    v_tit := 'Nueva solicitud de vacaciones';
    v_msg := coalesce(v_nom,'Un empleado')||' pidió vacaciones del '||to_char(NEW.fecha_inicio,'DD/MM')||' al '||to_char(NEW.fecha_fin,'DD/MM/YYYY');
  ELSE
    IF NEW.tipo_solicitud = 'confirmacion_semana' THEN RETURN NEW; END IF;
    v_tipo := NEW.tipo_solicitud; v_url := '/rrhh/solicitudes';
    v_tit := CASE NEW.tipo_solicitud
      WHEN 'adelanto_sueldo' THEN 'Nuevo pedido de adelanto'
      WHEN 'elemento' THEN 'Nuevo pedido de elemento'
      WHEN 'cambio_horario' THEN 'Nuevo pedido de cambio de horario'
      WHEN 'dia_medico' THEN 'Nuevo aviso de día médico'
      WHEN 'licencia_medica' THEN 'Nueva licencia médica'
      ELSE 'Nueva solicitud: '||replace(NEW.tipo_solicitud,'_',' ') END;
    v_msg := coalesce(v_nom,'Un empleado')||coalesce(' — '||nullif(NEW.descripcion,''),'');
  END IF;
  INSERT INTO notificaciones(usuario_id, titulo, mensaje, tipo, metadata)
  SELECT e.user_id, v_tit, v_msg, 'solicitud_'||v_tipo,
    jsonb_build_object('solicitud_id', NEW.id, 'empleado_id', NEW.empleado_id, 'url', v_url)
  FROM empleados e WHERE e.rol='admin_rrhh' AND e.activo AND e.user_id IS NOT NULL
    AND e.id IS DISTINCT FROM NEW.empleado_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notif_rrhh_sol_generales ON public.solicitudes_generales;
CREATE TRIGGER trg_notif_rrhh_sol_generales AFTER INSERT ON public.solicitudes_generales
FOR EACH ROW EXECUTE FUNCTION public.notificar_rrhh_nueva_solicitud();
DROP TRIGGER IF EXISTS trg_notif_rrhh_sol_vacaciones ON public.solicitudes_vacaciones;
CREATE TRIGGER trg_notif_rrhh_sol_vacaciones AFTER INSERT ON public.solicitudes_vacaciones
FOR EACH ROW EXECUTE FUNCTION public.notificar_rrhh_nueva_solicitud();

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP POLICY IF EXISTS "Los usuarios pueden borrar sus propias notificaciones" ON public.notificaciones;
CREATE POLICY "Los usuarios pueden borrar sus propias notificaciones" ON public.notificaciones
FOR DELETE TO authenticated USING (usuario_id = auth.uid());
GRANT SELECT, UPDATE, DELETE ON public.notificaciones TO authenticated;