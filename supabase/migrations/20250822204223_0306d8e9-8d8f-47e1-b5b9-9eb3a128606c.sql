-- SOLUCIÓN DE SEGURIDAD: Proteger información sensible del negocio
-- Eliminar políticas públicas peligrosas y crear estructura de seguridad por capas

-- 1. Eliminar todas las políticas públicas existentes
DROP POLICY IF EXISTS "Enable read access for all users" ON public.gondolas;
DROP POLICY IF EXISTS "simple_select_policy" ON public.gondolas;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.gondolas;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.gondolas;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.gondolas;
DROP POLICY IF EXISTS "auth_insert_policy" ON public.gondolas;
DROP POLICY IF EXISTS "auth_update_policy" ON public.gondolas;
DROP POLICY IF EXISTS "auth_delete_policy" ON public.gondolas;

-- 2. Crear vista pública limitada (solo información básica de layout sin datos sensibles)
CREATE OR REPLACE VIEW public.gondolas_public AS
SELECT 
  id,
  type,
  position_x,
  position_y,
  position_width,
  position_height,
  status,
  section,
  -- No exponer: brand, category, end_date, notes, image_url
  CASE 
    WHEN status = 'occupied' THEN 'Espacio Ocupado'
    ELSE 'Disponible'
  END as category
FROM public.gondolas;

-- 3. Dar acceso público solo a la vista limitada
GRANT SELECT ON public.gondolas_public TO anon;

-- 4. Políticas restrictivas para la tabla principal (solo usuarios autenticados)
CREATE POLICY "authenticated_users_full_access" 
ON public.gondolas 
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Función para verificar si el usuario tiene rol admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- Si no hay perfiles o sistema de roles, por defecto todos los autenticados son admin
  -- Esto se puede personalizar cuando implementen roles específicos
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. Política adicional para administradores (preparado para sistema de roles futuro)
CREATE POLICY "admin_users_manage_gondolas" 
ON public.gondolas 
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- 7. Asegurar que RLS está habilitado
ALTER TABLE public.gondolas ENABLE ROW LEVEL SECURITY;