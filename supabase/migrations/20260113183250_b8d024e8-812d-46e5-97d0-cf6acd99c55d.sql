-- Agregar página del instructivo de delegación de tareas al sidebar
INSERT INTO public.app_pages (
  nombre,
  path,
  icon,
  descripcion,
  orden,
  visible,
  mostrar_en_sidebar,
  requiere_auth,
  roles_permitidos,
  tipo
) VALUES (
  'Instructivo Delegación',
  '/instructivo/delegacion-tareas',
  'BookOpen',
  'Guía para delegación de tareas',
  85,
  true,
  true,
  true,
  ARRAY['admin', 'gerente_sucursal', 'empleado'],
  'link'
);