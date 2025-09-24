-- Add puntos_valor column to the newMedal state and form
-- First, let's check if puntos_valor already exists and add it if not
ALTER TABLE public.insignias 
ADD COLUMN IF NOT EXISTS puntos_valor integer DEFAULT 0;