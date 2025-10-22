-- Mover Gestión de Medallas a la sección Reconocimiento
UPDATE app_pages 
SET parent_id = '877159ad-a422-4a78-9ae4-f0e88ab9d2a8',
    orden = 5
WHERE path = '/medal-management';

-- Agregar políticas RLS para administradores en tabla insignias
CREATE POLICY "Admins pueden gestionar insignias"
ON public.insignias
FOR ALL
USING (is_admin());

-- Agregar política para que admins puedan ver todas las asignaciones de insignias
CREATE POLICY "Admins pueden ver todas las insignias asignadas"
ON public.insignias_empleado
FOR SELECT
USING (is_admin());

-- Agregar política para que admins puedan asignar insignias
CREATE POLICY "Admins pueden asignar insignias"
ON public.insignias_empleado
FOR INSERT
WITH CHECK (is_admin());

-- Política para que admins puedan eliminar asignaciones
CREATE POLICY "Admins pueden eliminar asignaciones de insignias"
ON public.insignias_empleado
FOR DELETE
USING (is_admin());