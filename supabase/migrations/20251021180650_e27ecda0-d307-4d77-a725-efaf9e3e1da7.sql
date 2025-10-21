-- Fase 2: Unificación de sistemas de navegación (CORREGIDO)
-- Agregar campos faltantes a app_pages para consolidar sidebar_links

-- 1. Agregar nuevas columnas a app_pages
ALTER TABLE app_pages 
  ADD COLUMN IF NOT EXISTS mostrar_en_sidebar boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'link' CHECK (tipo IN ('link', 'separator'));

-- 2. Migrar datos de sidebar_links a app_pages (solo si existen datos que no están ya en app_pages)
-- Primero migramos los links principales (sin parent_id)
INSERT INTO app_pages (
  path,
  nombre,
  titulo_pagina,
  descripcion,
  icon,
  orden,
  visible,
  requiere_auth,
  roles_permitidos,
  parent_id,
  mostrar_en_sidebar,
  tipo
)
SELECT 
  sl.path,
  sl.label,
  sl.label, -- usar el mismo label como titulo_pagina
  sl.descripcion,
  sl.icon,
  sl.orden,
  sl.visible,
  true, -- requiere_auth por defecto
  ARRAY[sl.rol::text], -- CORREGIDO: convertir enum a texto antes del array
  NULL, -- parent_id se mantiene null inicialmente
  true, -- mostrar_en_sidebar
  COALESCE(sl.tipo, 'link') -- tipo, default 'link'
FROM sidebar_links sl
WHERE sl.parent_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM app_pages ap 
    WHERE ap.path = sl.path AND sl.rol::text = ANY(ap.roles_permitidos)
  )
ON CONFLICT DO NOTHING;

-- 3. Actualizar parent_id para los links hijos después de la migración inicial
WITH parent_mapping AS (
  SELECT 
    sl.id as sl_id,
    sl.label as sl_label,
    sl.path as sl_path,
    ap.id as ap_id
  FROM sidebar_links sl
  JOIN app_pages ap ON ap.path = sl.path
  WHERE sl.parent_id IS NULL
)
INSERT INTO app_pages (
  path,
  nombre,
  titulo_pagina,
  descripcion,
  icon,
  orden,
  visible,
  requiere_auth,
  roles_permitidos,
  parent_id,
  mostrar_en_sidebar,
  tipo
)
SELECT 
  sl.path,
  sl.label,
  sl.label,
  sl.descripcion,
  sl.icon,
  sl.orden,
  sl.visible,
  true,
  ARRAY[sl.rol::text], -- CORREGIDO: convertir enum a texto
  pm.ap_id, -- usar el ID del padre ya migrado
  true,
  COALESCE(sl.tipo, 'link')
FROM sidebar_links sl
JOIN parent_mapping pm ON pm.sl_id = sl.parent_id
WHERE sl.parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM app_pages ap 
    WHERE ap.path = sl.path AND sl.rol::text = ANY(ap.roles_permitidos)
  )
ON CONFLICT DO NOTHING;

-- 4. Mantener sidebar_links por ahora como backup (no eliminar todavía)

-- 5. Crear índices para mejorar performance de queries del sidebar
CREATE INDEX IF NOT EXISTS idx_app_pages_sidebar ON app_pages(mostrar_en_sidebar, visible, orden) WHERE mostrar_en_sidebar = true;
CREATE INDEX IF NOT EXISTS idx_app_pages_roles ON app_pages USING gin(roles_permitidos);