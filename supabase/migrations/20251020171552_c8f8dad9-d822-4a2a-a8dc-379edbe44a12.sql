-- Insertar páginas faltantes del sistema
INSERT INTO public.app_pages (path, nombre, titulo_pagina, descripcion, icon, orden, roles_permitidos) VALUES
  ('/nomina', 'Nómina', 'Gestión de Nómina', 'Administración de nóminas y salarios', 'DollarSign', 15, ARRAY['admin_rrhh']),
  ('/autogestion', 'Autogestión', 'Autogestión', 'Portal de autogestión del empleado', 'User', 16, ARRAY['admin_rrhh', 'gerente_sucursal', 'empleado']),
  ('/comercio', 'Comercio', 'Comercio', 'Sistema comercial', 'ShoppingCart', 17, ARRAY['admin_rrhh', 'gerente_sucursal']),
  ('/centum', 'Centum', 'Centum', 'Sistema Centum', 'Building', 18, ARRAY['admin_rrhh']),
  ('/gulero', 'Gulero', 'Gulero', 'Sistema Gulero', 'Package', 19, ARRAY['admin_rrhh', 'gerente_sucursal']),
  ('/mayorista', 'Mayorista', 'Mayorista', 'Sistema Mayorista', 'Warehouse', 20, ARRAY['admin_rrhh']),
  ('/particular', 'Particular', 'Particular', 'Sistema Particular', 'User', 21, ARRAY['admin_rrhh']),
  ('/reventa', 'Reventa', 'Reventa', 'Sistema de Reventa', 'RefreshCw', 22, ARRAY['admin_rrhh']),
  ('/kiosko-checkin', 'Kiosko Check-in', 'Kiosko de Fichaje', 'Terminal de fichaje facial', 'Tablet', 23, ARRAY['admin_rrhh']),
  ('/desafios-tv', 'Desafíos TV', 'Vista TV de Desafíos', 'Pantalla de desafíos para TV', 'Tv', 24, ARRAY['admin_rrhh']),
  ('/gondolas-edit', 'Edición de Góndolas', 'Editor de Góndolas', 'Herramienta de edición de góndolas', 'Edit', 25, ARRAY['admin_rrhh', 'gerente_sucursal']),
  ('/medal-management', 'Gestión de Medallas', 'Gestión de Medallas', 'Administración de medallas e insignias', 'Award', 26, ARRAY['admin_rrhh'])
ON CONFLICT (path) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  titulo_pagina = EXCLUDED.titulo_pagina,
  descripcion = EXCLUDED.descripcion,
  icon = EXCLUDED.icon,
  roles_permitidos = EXCLUDED.roles_permitidos;