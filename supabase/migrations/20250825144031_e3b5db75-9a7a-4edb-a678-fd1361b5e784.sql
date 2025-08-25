-- Fix the type check constraint to use underscores instead of hyphens
ALTER TABLE gondolas DROP CONSTRAINT IF EXISTS gondolas_type_check;

-- Add the corrected check constraint with underscore format
ALTER TABLE gondolas ADD CONSTRAINT gondolas_type_check 
CHECK (type IN ('gondola', 'puntera', 'cartel_exterior', 'exhibidor_impulso'));