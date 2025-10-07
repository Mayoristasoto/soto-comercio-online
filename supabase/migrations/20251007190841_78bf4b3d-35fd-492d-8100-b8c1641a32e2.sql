-- Agregar relaciones de clave foránea a solicitudes_vacaciones
ALTER TABLE public.solicitudes_vacaciones
  DROP CONSTRAINT IF EXISTS solicitudes_vacaciones_empleado_id_fkey,
  DROP CONSTRAINT IF EXISTS solicitudes_vacaciones_aprobado_por_fkey;

ALTER TABLE public.solicitudes_vacaciones
  ADD CONSTRAINT solicitudes_vacaciones_empleado_id_fkey 
  FOREIGN KEY (empleado_id) 
  REFERENCES public.empleados(id) 
  ON DELETE CASCADE;

ALTER TABLE public.solicitudes_vacaciones
  ADD CONSTRAINT solicitudes_vacaciones_aprobado_por_fkey 
  FOREIGN KEY (aprobado_por) 
  REFERENCES public.empleados(id) 
  ON DELETE SET NULL;