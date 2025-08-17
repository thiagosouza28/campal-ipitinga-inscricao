-- Create districts table
CREATE TABLE public.districts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create churches table
CREATE TABLE public.churches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  district_id UUID NOT NULL REFERENCES public.districts(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, district_id)
);

-- Create registrations table
CREATE TABLE public.registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  age INTEGER NOT NULL,
  district_id UUID NOT NULL REFERENCES public.districts(id),
  church_id UUID NOT NULL REFERENCES public.churches(id),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  payment_method TEXT CHECK (payment_method IN ('pix', 'cash')),
  registration_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no authentication required)
CREATE POLICY "Allow public read access to districts" 
ON public.districts FOR SELECT 
USING (true);

CREATE POLICY "Allow public read access to churches" 
ON public.churches FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to registrations" 
ON public.registrations FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public read access to registrations" 
ON public.registrations FOR SELECT 
USING (true);

CREATE POLICY "Allow public update access to registrations" 
ON public.registrations FOR UPDATE 
USING (true);

-- Insert sample districts
INSERT INTO public.districts (name) VALUES 
('Distrito 1'),
('Distrito 2'),
('Distrito 3'),
('Distrito Central');

-- Insert sample churches
INSERT INTO public.churches (name, district_id) VALUES 
('Igreja Sede - Ipitinga', (SELECT id FROM public.districts WHERE name = 'Distrito Central')),
('Igreja do Bairro São José', (SELECT id FROM public.districts WHERE name = 'Distrito 1')),
('Igreja do Bairro Santa Maria', (SELECT id FROM public.districts WHERE name = 'Distrito 1')),
('Igreja do Centro', (SELECT id FROM public.districts WHERE name = 'Distrito 2')),
('Igreja da Vila Nova', (SELECT id FROM public.districts WHERE name = 'Distrito 2')),
('Igreja do Bairro Alto', (SELECT id FROM public.districts WHERE name = 'Distrito 3'));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_registrations_updated_at
BEFORE UPDATE ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();