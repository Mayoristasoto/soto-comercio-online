-- Crear función para obtener la fecha actual en zona horaria Argentina
CREATE OR REPLACE FUNCTION get_current_date_argentina()
RETURNS DATE
LANGUAGE SQL
STABLE
AS $$
  SELECT CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires';
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION get_current_date_argentina() TO authenticated, anon;