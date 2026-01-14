-- Eliminar la foreign key existente
ALTER TABLE empleado_cruces_rojas 
DROP CONSTRAINT empleado_cruces_rojas_fichaje_id_fkey;

-- Recrear con ON DELETE SET NULL
ALTER TABLE empleado_cruces_rojas 
ADD CONSTRAINT empleado_cruces_rojas_fichaje_id_fkey 
FOREIGN KEY (fichaje_id) 
REFERENCES fichajes(id) 
ON DELETE SET NULL;