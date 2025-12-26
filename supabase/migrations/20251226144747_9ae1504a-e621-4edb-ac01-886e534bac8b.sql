-- Agregar política de lectura pública para fichado_configuracion
-- El kiosco necesita leer la configuración (como pin_habilitado) sin autenticación de admin

CREATE POLICY "Allow public read access to configuration" 
ON public.fichado_configuracion 
FOR SELECT 
USING (true);