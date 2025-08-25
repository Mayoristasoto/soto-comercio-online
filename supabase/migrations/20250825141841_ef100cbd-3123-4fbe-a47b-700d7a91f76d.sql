-- Update the type check constraint to include new types
ALTER TABLE gondolas DROP CONSTRAINT IF EXISTS gondolas_type_check;

-- Add the new check constraint with all allowed types
ALTER TABLE gondolas ADD CONSTRAINT gondolas_type_check 
CHECK (type IN ('gondola', 'puntera', 'cartel-exterior', 'exhibidor-impulso'));