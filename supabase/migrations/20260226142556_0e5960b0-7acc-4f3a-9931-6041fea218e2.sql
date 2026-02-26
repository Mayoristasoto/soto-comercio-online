-- Tabla de novedades/alertas
CREATE TABLE public.novedades_alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_fin TIMESTAMPTZ NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT true,
  asignacion_tipo TEXT NOT NULL DEFAULT 'todos',
  roles_asignados TEXT[] DEFAULT '{}',
  empleados_asignados UUID[] DEFAULT '{}',
  imprimible BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla para trackear vistas por empleado por día
CREATE TABLE public.novedades_vistas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novedad_id UUID REFERENCES public.novedades_alertas(id) ON DELETE CASCADE,
  empleado_id UUID REFERENCES public.empleados(id) ON DELETE CASCADE,
  fecha_vista DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(novedad_id, empleado_id, fecha_vista)
);

-- RLS
ALTER TABLE public.novedades_alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.novedades_vistas ENABLE ROW LEVEL SECURITY;

-- Admin can manage novedades
CREATE POLICY "Admins can manage novedades_alertas"
ON public.novedades_alertas
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin_rrhh'))
WITH CHECK (public.has_role(auth.uid(), 'admin_rrhh'));

-- Admin can view novedades_vistas
CREATE POLICY "Admins can view novedades_vistas"
ON public.novedades_vistas
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin_rrhh'));

-- RPC para kiosco: obtener novedades pendientes
CREATE OR REPLACE FUNCTION public.kiosk_get_novedades(p_empleado_id UUID)
RETURNS TABLE(id UUID, titulo TEXT, contenido TEXT, imprimible BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.titulo, n.contenido, n.imprimible
  FROM novedades_alertas n
  WHERE n.activa = true
    AND now() BETWEEN n.fecha_inicio AND n.fecha_fin
    AND (
      n.asignacion_tipo = 'todos'
      OR (n.asignacion_tipo = 'roles' AND EXISTS (
        SELECT 1 FROM empleados e WHERE e.id = p_empleado_id AND e.puesto = ANY(n.roles_asignados)
      ))
      OR (n.asignacion_tipo = 'empleados' AND p_empleado_id = ANY(n.empleados_asignados))
    )
    AND NOT EXISTS (
      SELECT 1 FROM novedades_vistas v 
      WHERE v.novedad_id = n.id AND v.empleado_id = p_empleado_id AND v.fecha_vista = CURRENT_DATE
    );
END;
$$;

-- RPC para marcar novedad como vista
CREATE OR REPLACE FUNCTION public.kiosk_marcar_novedad_vista(p_novedad_id UUID, p_empleado_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO novedades_vistas (novedad_id, empleado_id, fecha_vista)
  VALUES (p_novedad_id, p_empleado_id, CURRENT_DATE)
  ON CONFLICT DO NOTHING;
END;
$$;