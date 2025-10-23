-- Asegurar permisos para que el cliente pueda invocar el RPC
GRANT EXECUTE ON FUNCTION public.registrar_intento_login(
  TEXT, TEXT, TEXT, BOOLEAN, UUID, TEXT, JSONB
) TO anon, authenticated;

-- Opcional: asegurar visibilidad ordenada por defecto (no crítico para el cliente)
-- Nota: la app ya ordena por created_at desc
