-- First, check what data exists in the affected tables
DO $$
DECLARE
    orphaned_tasks INTEGER;
    orphaned_trainings INTEGER;
BEGIN
    -- Check for orphaned tasks (asignado_a doesn't exist in empleados)
    SELECT COUNT(*) INTO orphaned_tasks
    FROM tareas t
    LEFT JOIN empleados e ON t.asignado_a = e.id
    WHERE e.id IS NULL;
    
    -- Check for orphaned training assignments
    SELECT COUNT(*) INTO orphaned_trainings
    FROM asignaciones_capacitacion ac
    LEFT JOIN empleados e ON ac.empleado_id = e.id
    WHERE e.id IS NULL;
    
    RAISE NOTICE 'Found % orphaned tasks and % orphaned training assignments', orphaned_tasks, orphaned_trainings;
    
    -- Delete orphaned records
    DELETE FROM tareas t
    WHERE NOT EXISTS (
        SELECT 1 FROM empleados e WHERE e.id = t.asignado_a
    );
    
    DELETE FROM asignaciones_capacitacion ac
    WHERE NOT EXISTS (
        SELECT 1 FROM empleados e WHERE e.id = ac.empleado_id
    );
    
    -- Now add the foreign key constraints
    ALTER TABLE public.tareas 
    ADD CONSTRAINT tareas_asignado_a_fkey 
    FOREIGN KEY (asignado_a) REFERENCES public.empleados(id) ON DELETE SET NULL;

    ALTER TABLE public.tareas 
    ADD CONSTRAINT tareas_asignado_por_fkey 
    FOREIGN KEY (asignado_por) REFERENCES public.empleados(id) ON DELETE SET NULL;

    ALTER TABLE public.asignaciones_capacitacion 
    ADD CONSTRAINT asignaciones_capacitacion_empleado_id_fkey 
    FOREIGN KEY (empleado_id) REFERENCES public.empleados(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Successfully added foreign key constraints';
END
$$;