-- 1. Guardar el autor preferido de las anotaciones automáticas
INSERT INTO fichado_configuracion (clave, valor)
VALUES ('exigencia_autor_anotaciones', '96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;

-- 2. Recrear la función de escala usando ese autor
CREATE OR REPLACE FUNCTION public.aplicar_escala_exigencia()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
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
    -- Autor de las anotaciones automáticas: configurable, por defecto Gonzalo Justiniano
    autor := COALESCE(
      (SELECT NULLIF(valor,'')::uuid FROM fichado_configuracion WHERE clave='exigencia_autor_anotaciones'),
      '96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4'::uuid);
    IF autor IS NOT NULL AND NOT EXISTS (SELECT 1 FROM empleados_anotaciones a WHERE a.empleado_id=emp.id AND a.titulo = v_titulo) THEN
      INSERT INTO empleados_anotaciones (empleado_id, creado_por, categoria, titulo, descripcion, requiere_seguimiento, es_critica)
      VALUES (emp.id, autor, cat, v_titulo, 'Generado por las reglas de exigencia del mes.', cat='apercibimiento', cat='apercibimiento');
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'aplicar_escala_exigencia: %', SQLERRM; RETURN NEW;
END
$fn$;

-- 3. Reasignar los llamados automáticos ya creados a nombre de Juan Cruz Soto
UPDATE empleados_anotaciones
SET creado_por = '96baa3f9-ceeb-4a6d-a60c-97afa8aaa7b4',
    updated_at = now()
WHERE creado_por = 'fe7c1d88-dd1d-460b-99d6-7435c9c93b58'
  AND titulo LIKE '%automático%';