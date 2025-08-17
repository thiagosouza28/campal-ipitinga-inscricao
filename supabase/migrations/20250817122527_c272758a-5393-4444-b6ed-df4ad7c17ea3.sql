-- Add IPITINGA district if it doesn't exist
INSERT INTO public.districts (name) 
VALUES ('IPITINGA')
ON CONFLICT (name) DO NOTHING;

-- Add all IPITINGA churches
INSERT INTO public.churches (name, district_id) 
SELECT church_name, d.id
FROM (VALUES 
  ('ATEUA-GRANDE - IPITINGA – ANPA'),
  ('ATEUAZINHO - IPITINGA - ANPA'),
  ('ATLETICO - IPITINGA - ANPA'),
  ('BOM FUTURO - IPITINGA – ANPA'),
  ('BOM JESUS - IPITINGA – ANPA'),
  ('CAMPINA - IPITINGA – ANPA'),
  ('CURUPERÉ - IPITINGA - ANPA'),
  ('IPITINGA DO MOJU - IPITINGA – ANPA'),
  ('JAMBUAÇÚ - IPITINGA – ANPA'),
  ('LUSO BRASILEIRO - IPITINGA – ANPA'),
  ('MONTE SINAI - KM 34 - IPITINGA – ANPA'),
  ('MONTE SINAI II - KM 30 - IPITINGA – ANPA'),
  ('NOVA VIDA-IPITINGA - SEDE – ANPA'),
  ('PRIMAVERA - IPITINGA – ANPA'),
  ('TRACUATEUA - ACARÁ – ANPA'),
  ('TREVO - IPITINGA - ANPA')
) AS churches(church_name)
CROSS JOIN (SELECT id FROM public.districts WHERE name = 'IPITINGA') AS d
ON CONFLICT (name, district_id) DO NOTHING;