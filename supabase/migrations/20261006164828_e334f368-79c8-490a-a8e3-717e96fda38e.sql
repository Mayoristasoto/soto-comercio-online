INSERT INTO public.fichado_configuracion (clave, valor, descripcion, tipo) VALUES
('reglamento_obligatorio_activo','false','Exigir firma del Reglamento Interno','boolean'),
('mi_puntualidad_activo','false','Mostrar Mi puntualidad al empleado','boolean'),
('kiosco_avisos_exigencia_activo','false','Avisos de exigencia en kiosco','boolean'),
('whatsapp_global_activo','false','WhatsApp activo (general)','boolean'),
('wa_aviso_tardanza_activo','false','WA: llegada tarde / descanso','boolean'),
('wa_aviso_escala_activo','false','WA: escala de exigencia','boolean'),
('wa_aviso_salida_activo','false','WA: salida no fichada','boolean'),
('wa_aviso_reglamento_activo','false','WA: reglamento sin firmar','boolean'),
('wa_aviso_vacaciones_activo','false','WA: vacaciones resueltas','boolean'),
('wa_aviso_recibo_activo','false','WA: recibo disponible','boolean'),
('wa_plantilla_tardanza','Hola {nombre}, hoy registraste {detalle}. Llevás {n} falta(s) este mes.','Texto WA tardanza','string'),
('wa_plantilla_escala','Hola {nombre}, llegaste a {n} faltas este mes: {consecuencia}.','Texto WA escala','string'),
('wa_plantilla_salida','Hola {nombre}, no registraste tu salida de hoy.','Texto WA salida','string'),
('wa_plantilla_reglamento','Hola {nombre}, tenés pendiente firmar el Reglamento Interno.','Texto WA reglamento','string'),
('wa_plantilla_vacaciones','Hola {nombre}, tu solicitud de vacaciones fue {estado}.','Texto WA vacaciones','string'),
('wa_plantilla_recibo','Hola {nombre}, ya está disponible tu recibo de sueldo.','Texto WA recibo','string')
ON CONFLICT DO NOTHING;

INSERT INTO public.documentos_obligatorios (titulo, descripcion, contenido, tipo_documento, activo)
SELECT 'Reglamento Interno','Reglamento Interno de Mayorista Soto (BORRADOR - revisar antes de activar)',
'REGLAMENTO INTERNO - MAYORISTA SOTO (BORRADOR)

1. Puntualidad: el ingreso debe registrarse a la hora asignada. Tolerancia: 0 minutos.
2. Descansos: duración máxima de 40 minutos, dentro de la franja asignada.
3. Fichaje: es obligatorio registrar entrada, inicio y fin de descanso, y salida en el kiosco.
4. Escala de exigencia (por mes calendario, sumando llegadas tarde y descansos excedidos):
   - 1ra vez: queda registrada.
   - 2da vez: aviso al encargado y a RRHH.
   - 3ra vez: llamado de atención en el legajo.
   - 5ta vez: apercibimiento.
5. Uniforme y celular: uso de uniforme obligatorio; el celular no se usa durante la atención.
6. Tareas: las tareas obligatorias del día deben completarse antes de fichar la salida.

Declaro haber leído y aceptado este reglamento.','reglamento',false
WHERE NOT EXISTS (SELECT 1 FROM public.documentos_obligatorios WHERE titulo='Reglamento Interno');

CREATE OR REPLACE FUNCTION public.mi_puntualidad_mes(p_empleado_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH ini AS (SELECT date_trunc('month', (now() AT TIME ZONE 'America/Argentina/Buenos_Aires'))::date d)
  SELECT jsonb_build_object(
    'activo', coalesce((SELECT valor='true' FROM fichado_configuracion WHERE clave='mi_puntualidad_activo'),false),
    'tardes', coalesce((SELECT jsonb_agg(jsonb_build_object('fecha',fecha_fichaje,'minutos',minutos_retraso) ORDER BY fecha_fichaje) FROM fichajes_tardios, ini WHERE empleado_id=p_empleado_id AND fecha_fichaje>=ini.d),'[]'),
    'descansos', coalesce((SELECT jsonb_agg(jsonb_build_object('fecha',fecha_fichaje,'minutos',minutos_exceso) ORDER BY fecha_fichaje) FROM fichajes_pausas_excedidas, ini WHERE empleado_id=p_empleado_id AND fecha_fichaje>=ini.d),'[]'),
    'cruces', (SELECT count(*) FROM empleado_cruces_rojas, ini WHERE empleado_id=p_empleado_id AND fecha_infraccion>=ini.d AND coalesce(anulada,false)=false)
  )
$$;
GRANT EXECUTE ON FUNCTION public.mi_puntualidad_mes(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.kiosk_reglamento_pendiente(p_empleado_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT coalesce((SELECT valor='true' FROM fichado_configuracion WHERE clave='reglamento_obligatorio_activo'),false)
   AND EXISTS (SELECT 1 FROM documentos_obligatorios d WHERE d.titulo='Reglamento Interno' AND d.activo
     AND NOT EXISTS (SELECT 1 FROM documentos_firmas f WHERE f.documento_id=d.id AND f.empleado_id=p_empleado_id))
$$;
GRANT EXECUTE ON FUNCTION public.kiosk_reglamento_pendiente(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.activar_reglamento_interno()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_doc uuid; v_n integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin_rrhh') THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  SELECT id INTO v_doc FROM documentos_obligatorios WHERE titulo='Reglamento Interno' LIMIT 1;
  UPDATE documentos_obligatorios SET activo=true WHERE id=v_doc;
  INSERT INTO asignaciones_documentos_obligatorios (documento_id, empleado_id, activa)
  SELECT v_doc, e.id, true FROM empleados e WHERE e.activo
    AND NOT EXISTS (SELECT 1 FROM asignaciones_documentos_obligatorios a WHERE a.documento_id=v_doc AND a.empleado_id=e.id);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  UPDATE empleados e SET debe_firmar_documentos_iniciales=true WHERE e.activo
    AND NOT EXISTS (SELECT 1 FROM documentos_firmas f WHERE f.documento_id=v_doc AND f.empleado_id=e.id);
  UPDATE fichado_configuracion SET valor='true', updated_at=now() WHERE clave='reglamento_obligatorio_activo';
  RETURN v_n;
END $$;
GRANT EXECUTE ON FUNCTION public.activar_reglamento_interno() TO authenticated;

CREATE OR REPLACE FUNCTION public.estado_firmas_reglamento()
RETURNS TABLE(empleado_id uuid, nombre text, sucursal text, firmado boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT e.id, e.apellido||' '||e.nombre, s.nombre,
    EXISTS (SELECT 1 FROM documentos_firmas f JOIN documentos_obligatorios d ON d.id=f.documento_id WHERE d.titulo='Reglamento Interno' AND f.empleado_id=e.id)
  FROM empleados e LEFT JOIN sucursales s ON s.id=e.sucursal_id
  WHERE e.activo AND public.has_role(auth.uid(),'admin_rrhh')
  ORDER BY 3,2
$$;
GRANT EXECUTE ON FUNCTION public.estado_firmas_reglamento() TO authenticated;