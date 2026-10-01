CREATE OR REPLACE FUNCTION public.aplicar_escala_exigencia() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_tipo text := CASE WHEN TG_TABLE_NAME='fichajes_tardios' THEN 'tarde' ELSE 'descanso' END;
  etiqueta text := CASE WHEN TG_TABLE_NAME='fichajes_tardios' THEN 'llegadas tarde' ELSE 'excesos de descanso' END;
  esc jsonb; desde date; n int; emp RECORD; autor uuid; mes text; cat anotacion_categoria; v_titulo text;
BEGIN
  desde := COALESCE((SELECT NULLIF(valor,'')::date FROM fichado_configuracion WHERE clave='exigencia_desde'), '2026-10-01');
  IF NEW.fecha_fichaje < desde THEN RETURN NEW; END IF;
  esc := COALESCE((SELECT valor::jsonb FROM fichado_configuracion WHERE clave='exigencia_escalas'), '{"aviso":2,"llamado":3,"apercibimiento":5}');
  mes := to_char(NEW.fecha_fichaje,'YYYY-MM');
  EXECUTE format('SELECT count(*) FROM %I WHERE empleado_id=$1 AND COALESCE(justificado,false)=false AND to_char(fecha_fichaje,''YYYY-MM'')=$2', TG_TABLE_NAME)
    INTO n USING NEW.empleado_id, mes;
  SELECT id, nombre, apellido, sucursal_id INTO emp FROM empleados WHERE id=NEW.empleado_id;
  IF n IN ((esc->>'aviso')::int, (esc->>'llamado')::int, (esc->>'apercibimiento')::int) THEN
    INSERT INTO notificaciones (usuario_id, titulo, mensaje, tipo, metadata)
    SELECT e.user_id, 'Exigencia: '||emp.apellido||' '||emp.nombre,
      emp.apellido||' '||emp.nombre||' lleva '||n||' '||etiqueta||' en '||mes, 'alerta',
      jsonb_build_object('empleado_id',emp.id,'tipo',v_tipo,'cantidad',n,'periodo',mes)
    FROM empleados e WHERE e.activo AND e.user_id IS NOT NULL
      AND (e.rol='admin_rrhh' OR (e.rol='gerente_sucursal' AND e.sucursal_id=emp.sucursal_id));
  END IF;
  IF n IN ((esc->>'llamado')::int, (esc->>'apercibimiento')::int) THEN
    cat := CASE WHEN n = (esc->>'apercibimiento')::int THEN 'apercibimiento' ELSE 'llamado_atencion' END;
    v_titulo := CASE WHEN cat='apercibimiento' THEN 'Apercibimiento automático' ELSE 'Llamado de atención automático' END || ' - '||n||' '||etiqueta||' ('||mes||')';
    SELECT id INTO autor FROM empleados WHERE rol='admin_rrhh' AND activo ORDER BY created_at LIMIT 1;
    IF autor IS NOT NULL AND NOT EXISTS (SELECT 1 FROM empleados_anotaciones a WHERE a.empleado_id=emp.id AND a.titulo = v_titulo) THEN
      INSERT INTO empleados_anotaciones (empleado_id, creado_por, categoria, titulo, descripcion, requiere_seguimiento, es_critica)
      VALUES (emp.id, autor, cat, v_titulo, 'Generado por las reglas de exigencia del mes.', cat='apercibimiento', cat='apercibimiento');
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'aplicar_escala_exigencia: %', SQLERRM; RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.aplicar_escala_exigencia() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cfg_num(text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.informe_puntualidad(date,date) FROM PUBLIC, anon;
INSERT INTO public.app_pages (path, nombre, parent_id, icon, orden, visible, requiere_auth, roles_permitidos, mostrar_en_sidebar, tipo)
SELECT '/rrhh/informe-puntualidad','Informe de Puntualidad', parent_id, 'Clock', 3, true, true, ARRAY['admin_rrhh'], true, 'link'
FROM public.app_pages WHERE path='/rrhh/indice-ausentismo' AND NOT EXISTS (SELECT 1 FROM public.app_pages WHERE path='/rrhh/informe-puntualidad');