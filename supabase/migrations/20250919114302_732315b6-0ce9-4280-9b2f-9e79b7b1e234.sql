-- Sistema de Fichado con Reconocimiento Facial
-- Crear tablas necesarias para el sistema de fichado

-- Tabla de configuración de ubicaciones/sucursales para geocerca
CREATE TABLE public.fichado_ubicaciones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sucursal_id uuid REFERENCES public.sucursales(id),
  nombre text NOT NULL,
  direccion text,
  latitud numeric(10,8),
  longitud numeric(11,8),
  radio_metros integer DEFAULT 100,
  ip_whitelist text[],
  activa boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla de configuración de turnos
CREATE TYPE turno_tipo AS ENUM ('normal', 'nocturno', 'partido', 'flexible');

CREATE TABLE public.fichado_turnos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  tipo turno_tipo DEFAULT 'normal',
  hora_entrada time NOT NULL,
  hora_salida time NOT NULL,
  hora_pausa_inicio time,
  hora_pausa_fin time,
  tolerancia_entrada_minutos integer DEFAULT 10,
  tolerancia_salida_minutos integer DEFAULT 10,
  redondeo_minutos integer DEFAULT 5,
  permite_extras boolean DEFAULT true,
  sucursal_id uuid REFERENCES public.sucursales(id),
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla de asignación de turnos a empleados
CREATE TABLE public.empleado_turnos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id uuid REFERENCES public.empleados(id),
  turno_id uuid REFERENCES public.fichado_turnos(id),
  fecha_inicio date NOT NULL,
  fecha_fin date,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(empleado_id, fecha_inicio)
);

-- Tabla principal de fichajes
CREATE TYPE fichaje_tipo AS ENUM ('entrada', 'salida', 'pausa_inicio', 'pausa_fin');
CREATE TYPE fichaje_estado AS ENUM ('valido', 'pendiente', 'rechazado', 'corregido');
CREATE TYPE fichaje_metodo AS ENUM ('facial', 'manual', 'automatico');

CREATE TABLE public.fichajes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id uuid REFERENCES public.empleados(id),
  tipo fichaje_tipo NOT NULL,
  timestamp_real timestamp with time zone NOT NULL,
  timestamp_teorico timestamp with time zone,
  timestamp_aplicado timestamp with time zone,
  ubicacion_id uuid REFERENCES public.fichado_ubicaciones(id),
  metodo fichaje_metodo DEFAULT 'facial',
  estado fichaje_estado DEFAULT 'valido',
  latitud numeric(10,8),
  longitud numeric(11,8),
  ip_address inet,
  confianza_facial numeric(3,2),
  datos_adicionales jsonb DEFAULT '{}',
  sincronizado boolean DEFAULT true,
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla de incidencias de fichaje
CREATE TYPE incidencia_tipo AS ENUM ('olvido', 'error_tecnico', 'justificacion', 'correccion');
CREATE TYPE incidencia_estado AS ENUM ('pendiente', 'aprobada', 'rechazada');

CREATE TABLE public.fichaje_incidencias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id uuid REFERENCES public.empleados(id),
  fichaje_id uuid REFERENCES public.fichajes(id),
  tipo incidencia_tipo NOT NULL,
  descripcion text NOT NULL,
  fecha_incidencia date NOT NULL,
  hora_propuesta time,
  estado incidencia_estado DEFAULT 'pendiente',
  aprobado_por uuid REFERENCES public.empleados(id),
  fecha_aprobacion timestamp with time zone,
  comentarios_aprobador text,
  documentos_adjuntos text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla de auditoría
CREATE TABLE public.fichaje_auditoria (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tabla_afectada text NOT NULL,
  registro_id uuid NOT NULL,
  accion text NOT NULL,
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  usuario_id uuid REFERENCES public.empleados(id),
  ip_address inet,
  user_agent text,
  timestamp_accion timestamp with time zone DEFAULT now()
);

-- Tabla de configuración del sistema
CREATE TABLE public.fichado_configuracion (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clave text UNIQUE NOT NULL,
  valor text NOT NULL,
  descripcion text,
  tipo text DEFAULT 'string',
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES public.empleados(id)
);

-- Insertar configuraciones por defecto
INSERT INTO public.fichado_configuracion (clave, valor, descripcion, tipo) VALUES
('umbral_confianza_facial', '0.75', 'Umbral mínimo de confianza para aceptar reconocimiento facial', 'number'),
('max_intentos_facial', '3', 'Máximo número de intentos de reconocimiento facial', 'number'),
('tiempo_sesion_minutos', '480', 'Tiempo máximo de una sesión de trabajo en minutos', 'number'),
('permite_fichaje_offline', 'true', 'Permitir fichajes en modo offline', 'boolean'),
('backup_automatico', 'true', 'Realizar backup automático de datos', 'boolean'),
('retener_logs_dias', '90', 'Días para retener logs de auditoría', 'number'),
('geocerca_obligatoria', 'true', 'Requiere estar dentro de la geocerca para fichar', 'boolean'),
('ip_whitelist_obligatoria', 'false', 'Requiere IP autorizada para fichar', 'boolean');

-- Crear índices para rendimiento (corregidos)
CREATE INDEX idx_fichajes_empleado ON public.fichajes(empleado_id);
CREATE INDEX idx_fichajes_timestamp ON public.fichajes(timestamp_real);
CREATE INDEX idx_fichajes_ubicacion ON public.fichajes(ubicacion_id);
CREATE INDEX idx_fichajes_estado ON public.fichajes(estado);
CREATE INDEX idx_incidencias_empleado ON public.fichaje_incidencias(empleado_id);
CREATE INDEX idx_incidencias_fecha ON public.fichaje_incidencias(fecha_incidencia);
CREATE INDEX idx_incidencias_estado ON public.fichaje_incidencias(estado);
CREATE INDEX idx_auditoria_tabla_registro ON public.fichaje_auditoria(tabla_afectada, registro_id);
CREATE INDEX idx_auditoria_timestamp ON public.fichaje_auditoria(timestamp_accion);