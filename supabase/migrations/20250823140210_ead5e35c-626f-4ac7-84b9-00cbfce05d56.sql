-- Crear función pública para obtener datos completos de góndolas sin información sensible de usuarios
CREATE OR REPLACE FUNCTION public.get_gondolas_public_view()
RETURNS TABLE(
  id text,
  type text,
  position_x numeric,
  position_y numeric,
  position_width numeric,
  position_height numeric,
  status text,
  section text,
  category text,
  brand text,
  end_date text,
  image_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Devolver datos completos pero seguros para vista pública
  SELECT 
    g.id,
    g.type,
    g.position_x,
    g.position_y,
    g.position_width,
    g.position_height,
    g.status,
    g.section,
    g.category,
    g.brand,
    g.end_date,
    g.image_url
  FROM public.gondolas g
  ORDER BY g.created_at ASC;
$$;