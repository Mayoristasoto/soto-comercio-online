-- Add text_align column to graphic_elements table
ALTER TABLE public.graphic_elements 
ADD COLUMN text_align text DEFAULT 'center';