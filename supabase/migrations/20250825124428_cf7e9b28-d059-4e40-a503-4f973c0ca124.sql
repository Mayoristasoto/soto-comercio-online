-- Add new typography columns to graphic_elements table
ALTER TABLE public.graphic_elements 
ADD COLUMN font_family text DEFAULT 'Arial',
ADD COLUMN font_weight text DEFAULT 'normal',
ADD COLUMN font_style text DEFAULT 'normal',
ADD COLUMN text_decoration text DEFAULT 'none';

-- Update existing text elements with default values
UPDATE public.graphic_elements 
SET 
  font_family = 'Arial',
  font_weight = 'normal',
  font_style = 'normal',
  text_decoration = 'none'
WHERE type = 'text' AND font_family IS NULL;