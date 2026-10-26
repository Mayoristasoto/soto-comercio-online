DO $$
DECLARE w date := '2026-10-26';
BEGIN
  -- descansos escalonados de 40 min
  UPDATE h2_turnos t SET descanso_inicio = (t.hora_entrada + interval '3 hours' + ((abs(hashtext(t.empleado_id::text)) % 4) * interval '30 minutes'))::time,
    descanso_fin = (t.hora_entrada + interval '3 hours 40 minutes' + ((abs(hashtext(t.empleado_id::text)) % 4) * interval '30 minutes'))::time
  FROM h2_planes p WHERE p.id=t.plan_id AND p.semana_inicio=w AND t.descanso_inicio IS NULL;
  -- mínimos demo: 1 por puesto, 08:00-15:00, lun a sáb, en José Martí
  INSERT INTO h2_reglas_cobertura(sucursal_id, dia_semana, desde, hasta, puesto_id, minimo, critico)
  SELECT DISTINCT p.sucursal_id, d, '08:00'::time, '15:00'::time, t.puesto_id, 1, false
  FROM h2_planes p JOIN sucursales s ON s.id=p.sucursal_id JOIN h2_turnos t ON t.plan_id=p.id
  CROSS JOIN generate_series(1,6) d
  WHERE p.semana_inicio=w AND s.nombre='José Martí' AND t.puesto_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM h2_reglas_cobertura r WHERE r.sucursal_id=p.sucursal_id);
  -- estados variados (nunca publicado, así el kiosco no cambia)
  UPDATE h2_planes p SET estado = CASE s.nombre WHEN 'José Martí' THEN 'pendiente' WHEN 'Juan B. Justo' THEN 'aprobado' WHEN 'Administración' THEN 'devuelto' ELSE estado END
  FROM sucursales s WHERE s.id=p.sucursal_id AND p.semana_inicio=w;
END $$;