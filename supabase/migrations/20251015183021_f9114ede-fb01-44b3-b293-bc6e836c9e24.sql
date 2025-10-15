-- Add tipo column to sidebar_links to support separators
ALTER TABLE public.sidebar_links 
ADD COLUMN tipo VARCHAR(20) DEFAULT 'link' CHECK (tipo IN ('link', 'separator'));

-- Update existing rows to have tipo = 'link'
UPDATE public.sidebar_links 
SET tipo = 'link' 
WHERE tipo IS NULL;