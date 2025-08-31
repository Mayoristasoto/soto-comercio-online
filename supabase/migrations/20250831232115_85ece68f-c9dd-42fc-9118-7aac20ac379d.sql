-- Crear tipos ENUM para roles y estados
CREATE TYPE public.user_role AS ENUM ('admin_rrhh', 'gerente_sucursal', 'lider_grupo', 'empleado');
CREATE TYPE public.desafio_tipo_periodo AS ENUM ('semanal', 'mensual', 'semestral', 'anual');
CREATE TYPE public.desafio_estado AS ENUM ('borrador', 'activo', 'finalizado');
CREATE TYPE public.premio_tipo AS ENUM ('semanal', 'mensual', 'semestral', 'anual');
CREATE TYPE public.asignacion_estado AS ENUM ('pendiente', 'entregado');
CREATE TYPE public.beneficiario_tipo AS ENUM ('empleado', 'grupo');
CREATE TYPE public.movimiento_tipo AS ENUM ('egreso', 'ajuste', 'ingreso');

-- Tabla de sucursales
CREATE TABLE public.sucursales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  direccion TEXT,
  ciudad TEXT,
  provincia TEXT,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de grupos
CREATE TABLE public.grupos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE CASCADE,
  lider_id UUID, -- Se llenará después cuando creemos empleados
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de empleados (profiles extendida)
CREATE TABLE public.empleados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT,
  legajo TEXT,
  email TEXT UNIQUE NOT NULL,
  rol public.user_role NOT NULL DEFAULT 'empleado',
  sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE SET NULL,
  grupo_id UUID REFERENCES public.grupos(id) ON DELETE SET NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ahora podemos agregar la FK de lider_id en grupos
ALTER TABLE public.grupos 
ADD CONSTRAINT fk_grupos_lider 
FOREIGN KEY (lider_id) REFERENCES public.empleados(id) ON DELETE SET NULL;

-- Tabla de desafíos
CREATE TABLE public.desafios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo_periodo public.desafio_tipo_periodo NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  objetivos JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de objetivos con metas
  es_grupal BOOLEAN NOT NULL DEFAULT false,
  puntos_por_objetivo JSONB NOT NULL DEFAULT '{}'::jsonb, -- Mapeo objetivo -> puntos
  dependencias JSONB DEFAULT '{}'::jsonb, -- Requisitos para participar
  estado public.desafio_estado NOT NULL DEFAULT 'borrador',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de participaciones en desafíos
CREATE TABLE public.participaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  desafio_id UUID NOT NULL REFERENCES public.desafios(id) ON DELETE CASCADE,
  empleado_id UUID REFERENCES public.empleados(id) ON DELETE CASCADE,
  grupo_id UUID REFERENCES public.grupos(id) ON DELETE CASCADE,
  progreso DECIMAL(5,2) NOT NULL DEFAULT 0, -- Porcentaje 0-100
  evidencia_url TEXT,
  validado_por UUID REFERENCES public.empleados(id),
  fecha_validacion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Solo uno debe estar lleno: empleado_id O grupo_id
  CONSTRAINT participacion_empleado_o_grupo CHECK (
    (empleado_id IS NOT NULL AND grupo_id IS NULL) OR 
    (empleado_id IS NULL AND grupo_id IS NOT NULL)
  )
);

-- Tabla de premios
CREATE TABLE public.premios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo public.premio_tipo NOT NULL,
  monto_presupuestado DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock INTEGER,
  criterios_eligibilidad JSONB DEFAULT '{}'::jsonb,
  participantes JSONB DEFAULT '[]'::jsonb, -- IDs de empleados/grupos elegibles
  depende_de JSONB DEFAULT '{}'::jsonb, -- Dependencias de otros premios
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de asignaciones de premios
CREATE TABLE public.asignaciones_premio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  premio_id UUID NOT NULL REFERENCES public.premios(id) ON DELETE CASCADE,
  beneficiario_tipo public.beneficiario_tipo NOT NULL,
  beneficiario_id UUID NOT NULL, -- ID del empleado o grupo
  fecha_asignacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  estado public.asignacion_estado NOT NULL DEFAULT 'pendiente',
  costo_real DECIMAL(12,2),
  comprobante_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de puntos
CREATE TABLE public.puntos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  desafio_id UUID REFERENCES public.desafios(id) ON DELETE SET NULL,
  puntos INTEGER NOT NULL,
  motivo TEXT NOT NULL,
  fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de insignias
CREATE TABLE public.insignias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  icono TEXT, -- URL o nombre del icono
  criterio JSONB NOT NULL, -- Criterios para obtener la insignia
  descripcion TEXT,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de insignias de empleados
CREATE TABLE public.insignias_empleado (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  insignia_id UUID NOT NULL REFERENCES public.insignias(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  fecha_otorgada TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(insignia_id, empleado_id)
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desafios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_premio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insignias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insignias_empleado ENABLE ROW LEVEL SECURITY;

-- Función para obtener el empleado actual
CREATE OR REPLACE FUNCTION public.get_current_empleado()
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.empleados WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Función para verificar si es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.empleados 
    WHERE user_id = auth.uid() 
    AND rol = 'admin_rrhh'
    AND activo = true
  );
$$;

-- Función para verificar si es gerente de sucursal
CREATE OR REPLACE FUNCTION public.is_gerente_sucursal(sucursal_uuid UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.empleados 
    WHERE user_id = auth.uid() 
    AND rol = 'gerente_sucursal'
    AND activo = true
    AND (sucursal_uuid IS NULL OR sucursal_id = sucursal_uuid)
  );
$$;

-- Políticas RLS básicas para empleados
CREATE POLICY "Empleados pueden ver su propio perfil"
ON public.empleados FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins pueden ver todos los empleados"
ON public.empleados FOR SELECT
USING (public.is_admin());

CREATE POLICY "Gerentes pueden ver empleados de su sucursal"
ON public.empleados FOR SELECT
USING (
  public.is_gerente_sucursal(sucursal_id)
);

CREATE POLICY "Admins pueden gestionar empleados"
ON public.empleados FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Políticas para sucursales (todos pueden leer, solo admins modificar)
CREATE POLICY "Usuarios autenticados pueden ver sucursales"
ON public.sucursales FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo admins pueden gestionar sucursales"
ON public.sucursales FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Políticas para grupos
CREATE POLICY "Usuarios autenticados pueden ver grupos"
ON public.grupos FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins y gerentes pueden gestionar grupos"
ON public.grupos FOR ALL
USING (public.is_admin() OR public.is_gerente_sucursal(sucursal_id))
WITH CHECK (public.is_admin() OR public.is_gerente_sucursal(sucursal_id));

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER sucursales_updated_at
  BEFORE UPDATE ON public.sucursales
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER grupos_updated_at
  BEFORE UPDATE ON public.grupos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER empleados_updated_at
  BEFORE UPDATE ON public.empleados
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insertar datos de ejemplo
INSERT INTO public.sucursales (nombre, direccion, ciudad, provincia) VALUES
('José Martí', 'Av. José Martí 1234', 'San Miguel', 'Buenos Aires'),
('Juan B. Justo', 'Juan B. Justo 5678', 'Villa Madero', 'Buenos Aires'),
('Constitución', 'Av. Constitución 9012', 'CABA', 'Buenos Aires');

-- Insertar grupos de ejemplo
INSERT INTO public.grupos (nombre, sucursal_id) 
SELECT 
  'Grupo ' || generate_series(1, 4),
  s.id
FROM public.sucursales s;

-- Crear función para manejar nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user_empleado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo crear empleado si el email no existe ya
  IF NOT EXISTS (SELECT 1 FROM public.empleados WHERE email = NEW.email) THEN
    INSERT INTO public.empleados (
      user_id,
      nombre,
      apellido,
      email,
      rol
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'nombre', 'Nuevo'),
      COALESCE(NEW.raw_user_meta_data ->> 'apellido', 'Usuario'),
      NEW.email,
      'empleado'
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creando empleado para usuario %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Trigger para crear empleado cuando se crea un usuario
CREATE TRIGGER on_auth_user_created_empleado
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_empleado();