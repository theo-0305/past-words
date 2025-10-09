-- Seed endangered metadata for 8 African endangered languages
-- This migration adds endangered language metadata to existing languages

-- Insert endangered metadata for African languages
INSERT INTO public.endangered_languages (
  language_id, iso_639_3, family, region, countries, status, speakers_estimate, description, sources, featured
) VALUES
  -- Korandje (Algeria) - severely endangered
  ((SELECT id FROM public.languages WHERE code = 'kcy'), 'kcy', 'Nilo-Saharan', 'Tabelbala, southwest Algeria', ARRAY['Algeria'], 'severely_endangered', 1500,
   'Korandje is a severely endangered Songhay language spoken in Tabelbala, southwest Algeria. It has Berber and Arabic influences and is spoken by approximately 1,500 people.',
   '[{"label":"Ethnologue: Korandje","url":"https://www.ethnologue.com/language/kcy/"}]'::jsonb, true),

  -- Tidikelt (Algeria) - critically endangered  
  ((SELECT id FROM public.languages WHERE code = 'tia'), 'tia', 'Berber', 'Tidikelt region, Algeria', ARRAY['Algeria'], 'critically_endangered', 200,
   'Tidikelt is a critically endangered Berber language variety spoken in the Tidikelt region of Algeria. It belongs to the Tuareg group of Berber languages.',
   '[{"label":"Ethnologue: Tidikelt","url":"https://www.ethnologue.com/language/tia/"}]'::jsonb, false),

  -- Tchumbuli (Benin) - critically endangered
  ((SELECT id FROM public.languages WHERE code = 'bga'), 'bga', 'Niger-Congo', 'Benin', ARRAY['Benin'], 'critically_endangered', 500,
   'Tchumbuli is a critically endangered language spoken in Benin. It belongs to the Niger-Congo family and has very few remaining speakers.',
   '[{"label":"Ethnologue: Tchumbuli","url":"https://www.ethnologue.com/language/bga/"}]'::jsonb, false),

  -- Kua (Botswana) - definitely endangered
  ((SELECT id FROM public.languages WHERE code = 'tyu'), 'tyu', 'Khoe-Kwadi', 'Botswana', ARRAY['Botswana'], 'definitely_endangered', 3000,
   'Kua is a definitely endangered Kalahari Khoe language spoken in Botswana. It is part of the Central Khoe language group and has around 3,000 speakers.',
   '[{"label":"Ethnologue: Kua","url":"https://www.ethnologue.com/language/tyu/"}]'::jsonb, false),

  -- Taa (Botswana) - definitely endangered
  ((SELECT id FROM public.languages WHERE code = 'nmn'), 'nmn', 'Tuu', 'Botswana and Namibia', ARRAY['Botswana', 'Namibia'], 'definitely_endangered', 2500,
   'Taa (ǃXóõ) is a definitely endangered Tuu language known for its extensive use of click consonants. Spoken in Botswana and Namibia with approximately 2,500 speakers.',
   '[{"label":"Ethnologue: Taa","url":"https://www.ethnologue.com/language/nmn/"}]'::jsonb, true),

  -- Yeyi (Botswana/Namibia) - definitely endangered
  ((SELECT id FROM public.languages WHERE code = 'yey'), 'yey', 'Bantu', 'Botswana and Namibia', ARRAY['Botswana', 'Namibia'], 'definitely_endangered', 45000,
   'Yeyi is a definitely endangered Bantu language spoken in Botswana and Namibia. Despite having around 45,000 speakers, it faces pressure from dominant languages.',
   '[{"label":"Ethnologue: Yeyi","url":"https://www.ethnologue.com/language/yey/"}]'::jsonb, false),

  -- Xaise (Botswana) - critically endangered
  ((SELECT id FROM public.languages WHERE code = 'shg'), 'shg', 'Khoe-Kwadi', 'Botswana', ARRAY['Botswana'], 'critically_endangered', 150,
   'Xaise (Shua) is a critically endangered Khoe-Kwadi language spoken in Botswana. It has very few remaining speakers and is severely threatened by language shift.',
   '[{"label":"Ethnologue: Shua","url":"https://www.ethnologue.com/language/shg/"}]'::jsonb, false),

  -- Akum (Cameroon/Nigeria) - critically endangered
  ((SELECT id FROM public.languages WHERE code = 'aku'), 'aku', 'Niger-Congo', 'Cameroon and Nigeria', ARRAY['Cameroon', 'Nigeria'], 'critically_endangered', 5000,
   'Akum is a critically endangered Niger-Congo language spoken in Cameroon and Nigeria. It is an indigenous Bantoid language with approximately 5,000 speakers.',
   '[{"label":"Ethnologue: Akum","url":"https://www.ethnologue.com/language/aku/"}]'::jsonb, false)

ON CONFLICT (language_id) DO UPDATE SET
  iso_639_3 = EXCLUDED.iso_639_3,
  family = EXCLUDED.family,
  region = EXCLUDED.region,
  countries = EXCLUDED.countries,
  status = EXCLUDED.status,
  speakers_estimate = EXCLUDED.speakers_estimate,
  description = EXCLUDED.description,
  sources = EXCLUDED.sources,
  featured = EXCLUDED.featured,
  updated_at = now();