ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS exento_fichaje boolean NOT NULL DEFAULT false;

UPDATE public.empleados
SET exento_fichaje = true
WHERE (lower(apellido) LIKE '%galeote%' AND lower(nombre) LIKE '%mariano%')
   OR (lower(apellido) LIKE '%justiniano%' AND lower(nombre) LIKE '%gonzalo%');