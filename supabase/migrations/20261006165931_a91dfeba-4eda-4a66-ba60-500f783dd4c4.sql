CREATE OR REPLACE FUNCTION public.mi_puntualidad_mes(p_empleado_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH ini AS (SELECT date_trunc('month', (now() AT TIME ZONE 'America/Argentina/Buenos_Aires'))::date d)
  SELECT jsonb_build_object(
    'activo', coalesce((SELECT valor='true' FROM fichado_configuracion WHERE clave='mi_puntualidad_activo'),false),
    'kiosco_avisos', coalesce((SELECT valor='true' FROM fichado_configuracion WHERE clave='kiosco_avisos_exigencia_activo'),false),
    'tardes', coalesce((SELECT jsonb_agg(jsonb_build_object('fecha',fecha_fichaje,'minutos',minutos_retraso) ORDER BY fecha_fichaje) FROM fichajes_tardios, ini WHERE empleado_id=p_empleado_id AND fecha_fichaje>=ini.d),'[]'),
    'descansos', coalesce((SELECT jsonb_agg(jsonb_build_object('fecha',fecha_fichaje,'minutos',minutos_exceso) ORDER BY fecha_fichaje) FROM fichajes_pausas_excedidas, ini WHERE empleado_id=p_empleado_id AND fecha_fichaje>=ini.d),'[]'),
    'cruces', (SELECT count(*) FROM empleado_cruces_rojas, ini WHERE empleado_id=p_empleado_id AND fecha_infraccion>=ini.d AND coalesce(anulada,false)=false)
  )
$$;