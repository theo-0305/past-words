-- Add endangered languages to the database
INSERT INTO languages (code, name) VALUES
  ('shy', 'Shiyeyi'),
  ('ain', 'Ainu'),
  ('gwi', 'Gwichʼin'),
  ('cor', 'Cornish'),
  ('gla', 'Scottish Gaelic'),
  ('haw', 'Hawaiian'),
  ('nav', 'Navajo'),
  ('mao', 'Māori'),
  ('que', 'Quechua'),
  ('eus', 'Basque'),
  ('cym', 'Welsh'),
  ('bre', 'Breton'),
  ('smi', 'Sami'),
  ('iro', 'Cherokee')
ON CONFLICT (code) DO NOTHING;