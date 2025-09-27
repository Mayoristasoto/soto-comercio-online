-- Create table for job positions
CREATE TABLE public.puestos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  responsabilidades TEXT,
  requisitos TEXT,
  departamento TEXT,
  nivel_jerarquico INTEGER DEFAULT 1,
  salario_minimo NUMERIC(12,2),
  salario_maximo NUMERIC(12,2),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for position documents
CREATE TABLE public.puesto_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  puesto_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo_documento TEXT NOT NULL DEFAULT 'manual',
  url_archivo TEXT,
  contenido TEXT,
  orden INTEGER DEFAULT 0,
  obligatorio BOOLEAN DEFAULT false,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Foreign key constraints
  CONSTRAINT fk_puesto_documentos_puesto 
    FOREIGN KEY (puesto_id) 
    REFERENCES public.puestos(id) 
    ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.puestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puesto_documentos ENABLE ROW LEVEL SECURITY;

-- Create policies for puestos
CREATE POLICY "Admin RRHH can manage positions" 
ON public.puestos 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh' 
    AND e.activo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh' 
    AND e.activo = true
  )
);

CREATE POLICY "Authenticated users can view active positions" 
ON public.puestos 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND activo = true);

-- Create policies for puesto_documentos
CREATE POLICY "Admin RRHH can manage position documents" 
ON public.puesto_documentos 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh' 
    AND e.activo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.empleados e
    WHERE e.user_id = auth.uid() 
    AND e.rol = 'admin_rrhh' 
    AND e.activo = true
  )
);

CREATE POLICY "Employees can view documents for their position" 
ON public.puesto_documentos 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND activo = true 
  AND puesto_id IN (
    SELECT p.id 
    FROM public.puestos p 
    JOIN public.empleados e ON e.puesto = p.nombre 
    WHERE e.user_id = auth.uid()
  )
);

-- Add foreign key constraint to empleados table for puesto_id
ALTER TABLE public.empleados 
ADD COLUMN puesto_id UUID,
ADD CONSTRAINT fk_empleados_puesto 
  FOREIGN KEY (puesto_id) 
  REFERENCES public.puestos(id) 
  ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX idx_puestos_nombre ON public.puestos(nombre);
CREATE INDEX idx_puestos_activo ON public.puestos(activo);
CREATE INDEX idx_puesto_documentos_puesto_id ON public.puesto_documentos(puesto_id);
CREATE INDEX idx_puesto_documentos_activo ON public.puesto_documentos(activo);
CREATE INDEX idx_empleados_puesto_id ON public.empleados(puesto_id);

-- Update triggers for updated_at
CREATE TRIGGER update_puestos_updated_at
  BEFORE UPDATE ON public.puestos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_puesto_documentos_updated_at
  BEFORE UPDATE ON public.puesto_documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample positions
INSERT INTO public.puestos (nombre, descripcion, responsabilidades, departamento, nivel_jerarquico) VALUES
('Vendedor', 'Responsable de ventas al público', 'Atención al cliente, ventas, caja', 'Ventas', 1),
('Supervisor de Ventas', 'Supervisión del equipo de ventas', 'Liderar equipo, reportes, capacitación', 'Ventas', 2),
('Cajero', 'Manejo de caja y pagos', 'Procesar pagos, arqueos, atención al cliente', 'Administración', 1),
('Reponedor', 'Reposición de mercadería', 'Organizar productos, controlar stock, limpieza', 'Logística', 1),
('Gerente de Sucursal', 'Administración general de sucursal', 'Gestión integral, reportes, personal', 'Gerencia', 3);