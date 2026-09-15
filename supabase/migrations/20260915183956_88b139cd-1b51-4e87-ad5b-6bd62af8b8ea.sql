WITH medidas(sucursal_id, ancho, alto) AS (
  VALUES
    ('9682b6cf-f904-4497-918c-d0c9c061b9ec'::uuid, 1000.0, 700.0),
    ('6ebfc1f0-6435-47af-99e7-4db5b06ced84'::uuid, 1000.0, 919.0)
), posiciones AS (
  SELECT
    rp.id AS punto_id,
    rp.zona_id,
    (gv.position_x::numeric / m.ancho) * 100 AS x,
    (gv.position_y::numeric / m.alto) * 100 AS y,
    (gv.position_width::numeric / m.ancho) * 100 AS width,
    (gv.position_height::numeric / m.alto) * 100 AS height
  FROM public.recorrido_puntos rp
  JOIN public.recorrido_zonas rz ON rz.id = rp.zona_id
  JOIN public.recorrido_planos pl ON pl.id = rz.plano_id
  JOIN public.gondolas_v2 gv ON gv.id = rp.gondola_ref
  JOIN medidas m ON m.sucursal_id = pl.sucursal_id
)
UPDATE public.recorrido_puntos rp
SET x = p.x, y = p.y, width = p.width, height = p.height
FROM posiciones p
WHERE rp.id = p.punto_id;

WITH medidas(sucursal_id, ancho, alto) AS (
  VALUES
    ('9682b6cf-f904-4497-918c-d0c9c061b9ec'::uuid, 1000.0, 700.0),
    ('6ebfc1f0-6435-47af-99e7-4db5b06ced84'::uuid, 1000.0, 919.0)
), posiciones AS (
  SELECT DISTINCT ON (rz.id)
    rz.id AS zona_id,
    (gv.position_x::numeric / m.ancho) * 100 AS x,
    (gv.position_y::numeric / m.alto) * 100 AS y,
    (gv.position_width::numeric / m.ancho) * 100 AS width,
    (gv.position_height::numeric / m.alto) * 100 AS height
  FROM public.recorrido_zonas rz
  JOIN public.recorrido_planos pl ON pl.id = rz.plano_id
  JOIN public.recorrido_puntos rp ON rp.zona_id = rz.id
  JOIN public.gondolas_v2 gv ON gv.id = rp.gondola_ref
  JOIN medidas m ON m.sucursal_id = pl.sucursal_id
  ORDER BY rz.id, rp.orden
)
UPDATE public.recorrido_zonas rz
SET x = p.x, y = p.y, width = p.width, height = p.height
FROM posiciones p
WHERE rz.id = p.zona_id;