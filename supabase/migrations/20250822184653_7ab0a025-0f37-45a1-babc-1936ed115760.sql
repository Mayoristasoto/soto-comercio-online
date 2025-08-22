-- Create gondolas table for persistent storage
CREATE TABLE public.gondolas (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('gondola', 'puntera')),
  position_x DECIMAL NOT NULL,
  position_y DECIMAL NOT NULL,
  position_width DECIMAL NOT NULL,
  position_height DECIMAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('occupied', 'available')),
  brand TEXT,
  category TEXT NOT NULL,
  section TEXT NOT NULL,
  end_date TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.gondolas ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read, insert, update and delete
-- Since this is a collaborative editing system
CREATE POLICY "Anyone can manage gondolas" 
ON public.gondolas 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_gondolas_updated_at
  BEFORE UPDATE ON public.gondolas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();